import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

class TabClassifier {
  constructor() {
    this.model = null;
    this.useModel = null;
    this.categories = [
      'Code & Development', 'Documentation', 'Social Media', 'Shopping',
      'News & Articles', 'Video & Entertainment', 'Productivity & Tools',
      'Email & Communication', 'AI & Machine Learning', 'General Browsing'
    ];
    this.initialized = false;
    this.initializationPromise = null;
    this.useFallbackOnly = false;
  }

  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = (async () => {
      try {
        console.log('TabClassifier: Initializing TensorFlow.js...');
        await tf.setBackend('cpu');
        await tf.ready();
        console.log('TabClassifier: Backend set to:', tf.getBackend());

        console.log('TabClassifier: Loading Universal Sentence Encoder...');
        this.useModel = await use.load();
        console.log('TabClassifier: USE model loaded successfully');

        await this.createClassifier();
        this.initialized = true;
        this.useFallbackOnly = false;
        console.log('TabClassifier: Neural network initialized successfully');
        return true;
      } catch (error) {
        console.error('TabClassifier: Neural network initialization failed:', error);
        this.initialized = true;
        this.useFallbackOnly = true;
        console.log('TabClassifier: Using rule-based fallback mode');
        return true;
      }
    })();
    return this.initializationPromise;
  }

  async createClassifier() {
    const modelLoaded = await this.loadModelWeights();
    if (modelLoaded) {
      console.log("TabClassifier: Model and weights loaded successfully.");
      return;
    }
    console.warn("TabClassifier: No pre-trained model found. Creating a new, untrained model.");
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [512] }));
    this.model.add(tf.layers.dropout({ rate: 0.3 }));
    this.model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: this.categories.length, activation: 'softmax' }));
    this.model.compile({ optimizer: tf.train.adam(0.001), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
  }

  async loadModelWeights() {
    try {
      const storedWeights = await new Promise(resolve => {
        chrome.storage.local.get(['ml_model_weights'], result => resolve(result.ml_model_weights));
      });
      if (storedWeights && Object.keys(storedWeights).length > 0) {
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [512] }));
        this.model.add(tf.layers.dropout({ rate: 0.3 }));
        this.model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: this.categories.length, activation: 'softmax' }));
        const weightTensors = Object.keys(storedWeights).sort().map(key => tf.tensor(storedWeights[key]));
        this.model.setWeights(weightTensors);
        weightTensors.forEach(t => t.dispose());
        this.model.compile({ optimizer: tf.train.adam(0.001), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
        console.log('TabClassifier: Loaded USER-TRAINED model weights from storage.');
        return true;
      }
    } catch (error) {
      console.warn('TabClassifier: Could not load weights from storage.', error);
    }
    try {
      const modelUrl = chrome.runtime.getURL('ml/pretrained-model/model.json');
      this.model = await tf.loadLayersModel(modelUrl);
      this.model.compile({ optimizer: tf.train.adam(0.001), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
      console.log('TabClassifier: Loaded PRE-TRAINED model from extension bundle.');
      return true;
    } catch (error) {
      console.error('TabClassifier: Failed to load pre-trained model from bundle.', error);
      return false;
    }
  }

  // =================================================================
  // ===== FIX: REMOVED `weight.dispose()` ===========================
  // =================================================================
  async saveModelWeights() {
    try {
      const weights = await this.model.getWeights();
      const weightData = {};
      weights.forEach((weight, index) => {
        weightData[`weight_${index}`] = weight.arraySync();
        // REMOVED: This line was causing the error by destroying the model's live weights.
        // weight.dispose(); 
      });
      await new Promise((resolve) => {
        chrome.storage.local.set({ ml_model_weights: weightData }, resolve);
      });
      console.log('TabClassifier: Model weights saved to storage.');
    } catch (error) {
      console.error('TabClassifier: Failed to save weights:', error);
    }
  }

  async trainWithUserData(trainingExamples) {
    if (!this.model) {
      console.warn('TabClassifier: Model not available for training.');
      return false;
    }
    if (trainingExamples.length < 5) {
      console.log('TabClassifier: Not enough training data provided.');
      return false;
    }

    // Define tensors outside the try block to make them accessible in `finally`
    let embeddings = null;
    let oneHotLabels = null;

    try {
      const texts = trainingExamples.map(ex => ex.text);
      const labels = trainingExamples.map(ex => ex.label);
      
      // Create the tensors
      embeddings = await this.useModel.embed(texts);
      const labelIndices = labels.map(label => this.categories.indexOf(label));
      oneHotLabels = tf.oneHot(labelIndices, this.categories.length);
      
      // Train the model
      await this.model.fit(embeddings, oneHotLabels, {
        epochs: 10,
        batchSize: 4,
        validationSplit: 0.2,
      });
      
      // Save the improved weights after successful training
      await this.saveModelWeights();
      console.log('TabClassifier: Model fine-tuned with user data.');
      return true;

    } catch (error) {
      console.error('TabClassifier: Training with user data failed:', error);
      return false;
    } finally {
      // CRITICAL: Manually dispose of the created tensors to prevent memory leaks.
      // This block will run whether the training succeeds or fails.
      if (embeddings) {
        embeddings.dispose();
      }
      if (oneHotLabels) {
        oneHotLabels.dispose();
      }
      console.log("TabClassifier: Tensors from training run have been disposed.");
    }
  }

  async classifyTab(tabTitle, tabUrl) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.useFallbackOnly || !this.model || !this.useModel) {
      return this.fallbackClassification(tabTitle, tabUrl);
    }
    
    let embedding = null;
    let prediction = null;
    
    try {
      const domain = this.extractDomain(tabUrl);
      const textToClassify = `${tabTitle} ${domain}`.substring(0, 200);
      
      embedding = await this.useModel.embed([textToClassify]);
      prediction = this.model.predict(embedding);
      const scores = await prediction.data();
      
      let bestScore = 0;
      let bestCategory = this.categories[this.categories.length - 1]; // Default
      
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > bestScore) {
          bestScore = scores[i];
          bestCategory = this.categories[i];
        }
      }
      
      const CONFIDENCE_THRESHOLD = 0.3;
      if (bestScore < CONFIDENCE_THRESHOLD) {
        return this.fallbackClassification(tabTitle, tabUrl);
      }
      
      return {
        category: bestCategory,
        confidence: bestScore,
        scores: this.categories.reduce((obj, cat, idx) => ({ ...obj, [cat]: scores[idx] }), {})
      };
    } catch (error) {
      console.error('TabClassifier: Neural classification failed, using fallback:', error);
      return this.fallbackClassification(tabTitle, tabUrl);
    } finally {
      if (embedding) embedding.dispose();
      if (prediction) prediction.dispose();
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '').split('.')[0];
    } catch {
      return '';
    }
  }

  fallbackClassification(tabTitle, tabUrl) {
    // ... (This function remains unchanged)
    const title = tabTitle.toLowerCase();
    const url = tabUrl.toLowerCase();
    
    const rules = [
      { pattern: /github|gitlab|stack overflow|code|api|docs?\./, category: 'Code & Development' },
      { pattern: /docs?|documentation|tutorial|guide|reference/, category: 'Documentation' },
      { pattern: /twitter|facebook|instagram|reddit|social/, category: 'Social Media' },
      { pattern: /amazon|shop|buy|cart|checkout|ebay/, category: 'Shopping' },
      { pattern: /news|article|blog|medium|substack/, category: 'News & Articles' },
      { pattern: /youtube|watch|video|stream|netflix/, category: 'Video & Entertainment' },
      { pattern: /notion|drive|dropbox|calendar|meet|zoom/, category: 'Productivity & Tools' },
      { pattern: /mail|gmail|outlook|email|inbox/, category: 'Email & Communication' },
      { pattern: /chatgpt|openai|claude|ai|llm|machine learning/, category: 'AI & Machine Learning' }
    ];
    
    for (const rule of rules) {
      if (rule.pattern.test(title) || rule.pattern.test(url)) {
        return {
          category: rule.category,
          confidence: 0.85,
          scores: { [rule.category]: 0.85 }
        };
      }
    }
    
    return {
      category: 'General Browsing',
      confidence: 0.7,
      scores: { 'General Browsing': 0.7 }
    };
  }

  getCategoryEmoji(category) {
    // ... (This function remains unchanged)
    const emojiMap = {
      'Code & Development': '💻',
      'Documentation': '📚',
      'Social Media': '🐦',
      'Shopping': '🛒',
      'News & Articles': '📰',
      'Video & Entertainment': '🎬',
      'Productivity & Tools': '⚡',
      'Email & Communication': '📧',
      'AI & Machine Learning': '🤖',
      'General Browsing': '🌐'
    };
    
    return emojiMap[category] || '📁';
  }

  async getSmartGroupName(tabs) {
    // ... (This function remains unchanged)
    if (tabs.length === 0) return 'New Group';
    
    if (!this.initialized || this.useFallbackOnly) {
      const domain = tabs[0] ? this.extractDomain(tabs[0].url) : 'Tabs';
      return `📁 ${domain}`;
    }
    
    try {
      const tabsToAnalyze = tabs.slice(0, 10);
      const classifications = await Promise.all(
        tabsToAnalyze.map(tab => this.classifyTab(tab.title, tab.url))
      );
      
      const categoryCount = {};
      classifications.forEach(cls => {
        categoryCount[cls.category] = (categoryCount[cls.category] || 0) + 1;
      });
      
      let mostCommonCategory = 'General Browsing';
      let maxCount = 0;
      
      Object.entries(categoryCount).forEach(([category, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonCategory = category;
        }
      });
      
      const emoji = this.getCategoryEmoji(mostCommonCategory);
      return `${emoji} ${mostCommonCategory}`;
    } catch (error) {
      console.error('TabClassifier: Smart naming failed:', error);
      const domain = tabs[0] ? this.extractDomain(tabs[0].url) : 'Tabs';
      return `📁 ${domain}`;
    }
  }

  async mlAutoGroupAllTabs(ungroupedTabs, options = {}) {
    // ... (This function remains unchanged)
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      confidenceThreshold = 0.6,
      minGroupSize = 2,
      maxGroups = 10
    } = options;

    console.log(`TabClassifier: Starting ML auto-grouping for ${ungroupedTabs.length} tabs`);

    try {
      const classifications = await Promise.all(
        ungroupedTabs.map(async (tab) => this.classifyTab(tab.title, tab.url).then(classification => ({ tab, classification })))
      );
      
      const validTabs = classifications.filter(item => 
        item.classification.confidence >= confidenceThreshold
      );

      const categoryGroups = {};
      validTabs.forEach(({ tab, classification }) => {
        const category = classification.category;
        if (!categoryGroups[category]) categoryGroups[category] = { tabs: [], totalConfidence: 0 };
        categoryGroups[category].tabs.push(tab);
        categoryGroups[category].totalConfidence += classification.confidence;
      });

      const finalGroups = Object.values(categoryGroups)
        .map(group => ({
          ...group,
          category: group.tabs[0] ? validTabs.find(t=>t.tab.id === group.tabs[0].id).classification.category : 'General Browsing',
          avgConfidence: group.totalConfidence / group.tabs.length
        }))
        .filter(group => group.tabs.length >= minGroupSize)
        .sort((a, b) => b.tabs.length - a.tabs.length)
        .slice(0, maxGroups);

      const namedGroups = finalGroups.map(group => ({
        name: `${this.getCategoryEmoji(group.category)} ${group.category}`,
        tabIds: group.tabs.map(tab => tab.id)
      }));

      return { success: true, groups: namedGroups };

    } catch (error) {
      console.error('TabClassifier: ML auto-grouping failed:', error);
      return { success: false, error: error.message };
    }
  }
}

const tabClassifier = new TabClassifier();

export { tabClassifier };