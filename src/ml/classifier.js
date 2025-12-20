// src/ml/classifier.js - Fixed for Chrome Extension Service Worker
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

class TabClassifier {
  constructor() {
    this.model = null;
    this.useModel = null;
    this.categories = [
      'Code & Development',
      'Documentation',
      'Social Media',
      'Shopping',
      'News & Articles',
      'Video & Entertainment',
      'Productivity & Tools',
      'Email & Communication',
      'AI & Machine Learning',
      'General Browsing'
    ];
    this.initialized = false;
    this.initializationPromise = null;
    this.useFallbackOnly = false;
  }

  async initialize() {
    // Return existing initialization promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = (async () => {
      try {
        console.log('TabClassifier: Initializing TensorFlow.js...');
        
        // Set CPU backend for Chrome extension compatibility
        // Note: tf.setBackend will register the backend if not already registered
        await tf.setBackend('cpu');
        await tf.ready();
        
        console.log('TabClassifier: Backend set to:', tf.getBackend());
        
        // Load Universal Sentence Encoder with retry logic
        console.log('TabClassifier: Loading Universal Sentence Encoder...');
        try {
          this.useModel = await use.load();
          console.log('TabClassifier: USE model loaded successfully');
        } catch (useError) {
          console.error('TabClassifier: Failed to load USE model:', useError);
          throw new Error(`Universal Sentence Encoder failed to load: ${useError.message}`);
        }
        
        // Create classifier model
        await this.createClassifier();
        
        this.initialized = true;
        this.useFallbackOnly = false; // Neural network is active!
        console.log('TabClassifier: Neural network initialized successfully');
        return true;
        
      } catch (error) {
        console.error('TabClassifier: Neural network initialization failed:', error);
        console.error('Full error details:', error.message, error.stack);
        
        // Fallback to rule-based only
        console.log('TabClassifier: Using rule-based fallback mode');
        this.initialized = true;
        this.useFallbackOnly = true;
        return true;
      }
    })();
    
    return this.initializationPromise;
  }

  async createClassifier() {
    // Create a simple neural network for classification
    this.model = tf.sequential();
    
    // Input layer: USE embeddings are 512-dimensional
    this.model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
      inputShape: [512]
    }));
    
    // Dropout for regularization
    this.model.add(tf.layers.dropout({ rate: 0.3 }));
    
    // Hidden layer
    this.model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));
    
    // Output layer: softmax for multi-class classification
    this.model.add(tf.layers.dense({
      units: this.categories.length,
      activation: 'softmax'
    }));
    
    // Compile the model
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    // Load pre-trained weights if available
    await this.loadModelWeights();
  }

  async loadModelWeights() {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get(['ml_model_weights'], (result) => {
          if (result.ml_model_weights) {
            try {
              // Sort keys to maintain order
              const weightKeys = Object.keys(result.ml_model_weights).sort();
              const weightTensors = weightKeys.map(key => 
                tf.tensor(result.ml_model_weights[key])
              );
              
              if (weightTensors.length > 0) {
                this.model.setWeights(weightTensors);
                console.log('TabClassifier: Loaded saved model weights');
                
                // Clean up temporary tensors
                weightTensors.forEach(tensor => tensor.dispose());
              }
            } catch (error) {
              console.warn('TabClassifier: Failed to parse saved weights', error);
            }
          }
          resolve();
        });
      });
    } catch (error) {
      console.log('TabClassifier: No saved weights found');
    }
  }

  async saveModelWeights() {
    try {
      const weights = await this.model.getWeights();
      const weightData = {};
      
      // Convert tensors to serializable arrays
      weights.forEach((weight, index) => {
        weightData[`weight_${index}`] = weight.arraySync();
        weight.dispose(); // Clean up tensor
      });
      
      await new Promise((resolve) => {
        chrome.storage.local.set({ ml_model_weights: weightData }, resolve);
      });
      
      console.log('TabClassifier: Model weights saved');
    } catch (error) {
      console.error('TabClassifier: Failed to save weights:', error);
    }
  }

  async trainWithUserData(trainingExamples) {
    if (trainingExamples.length < 5) {
      console.log('TabClassifier: Not enough training data');
      return false;
    }
    
    try {
      // Prepare training data
      const texts = trainingExamples.map(ex => ex.text);
      const labels = trainingExamples.map(ex => ex.label);
      
      // Get embeddings
      const embeddings = await this.useModel.embed(texts);
      
      // Convert labels to one-hot encoding
      const labelIndices = labels.map(label => this.categories.indexOf(label));
      const oneHotLabels = tf.oneHot(labelIndices, this.categories.length);
      
      // Train the model
      await this.model.fit(embeddings, oneHotLabels, {
        epochs: 10,
        batchSize: 4,
        validationSplit: 0.2,
        verbose: 0
      });
      
      // Clean up
      embeddings.dispose();
      oneHotLabels.dispose();
      
      // Save the improved weights
      await this.saveModelWeights();
      
      console.log('TabClassifier: Model trained with user data');
      return true;
    } catch (error) {
      console.error('TabClassifier: Training failed:', error);
      return false;
    }
  }

  async classifyTab(tabTitle, tabUrl) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Use fallback if neural network failed to initialize or model is missing
    if (this.useFallbackOnly || !this.model || !this.useModel) {
      console.log('TabClassifier: Using fallback classification (neural network unavailable)');
      return this.fallbackClassification(tabTitle, tabUrl);
    }
    
    let embedding = null;
    let prediction = null;
    
    try {
      // Combine title and domain for better classification
      const domain = this.extractDomain(tabUrl);
      const textToClassify = `${tabTitle} ${domain}`.substring(0, 200); // Limit length
      
      // Get embedding
      embedding = await this.useModel.embed([textToClassify]);
      
      // Make prediction
      prediction = this.model.predict(embedding);
      const scores = await prediction.data();
      
      // Find the best category
      let bestScore = 0;
      let bestCategory = this.categories[this.categories.length - 1]; // Default: General Browsing
      
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > bestScore) {
          bestScore = scores[i];
          bestCategory = this.categories[i];
        }
      }
      
      // If confidence is too low (< 0.3), fallback to rule-based classification
      const CONFIDENCE_THRESHOLD = 0.3;
      if (bestScore < CONFIDENCE_THRESHOLD) {
        console.log(`TabClassifier: Low confidence (${bestScore.toFixed(3)}), using fallback`);
        return this.fallbackClassification(tabTitle, tabUrl);
      }
      
      return {
        category: bestCategory,
        confidence: bestScore,
        scores: this.categories.reduce((obj, cat, idx) => {
          obj[cat] = scores[idx];
          return obj;
        }, {})
      };
    } catch (error) {
      console.error('TabClassifier: Neural classification failed, using fallback:', error);
      return this.fallbackClassification(tabTitle, tabUrl);
    } finally {
      // Clean up tensors to prevent memory leaks
      try {
        if (embedding && embedding.dispose) embedding.dispose();
        if (prediction && prediction.dispose) prediction.dispose();
        // Optional: Clean up any remaining tensors
        tf.engine().startScope();
        tf.engine().endScope();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '').split('.')[0];
    } catch {
      return '';
    }
  }

  fallbackClassification(tabTitle, tabUrl) {
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
    if (tabs.length === 0) return 'New Group';
    
    if (!this.initialized || this.useFallbackOnly) {
      // Quick domain-based fallback
      const domain = tabs[0] ? this.extractDomain(tabs[0].url) : 'Tabs';
      return `📁 ${domain}`;
    }
    
    try {
      // Limit number of tabs to analyze for performance
      const tabsToAnalyze = tabs.slice(0, 10);
      const classifications = await Promise.all(
        tabsToAnalyze.map(tab => this.classifyTab(tab.title, tab.url))
      );
      
      // Count categories
      const categoryCount = {};
      classifications.forEach(cls => {
        categoryCount[cls.category] = (categoryCount[cls.category] || 0) + 1;
      });
      
      // Find most common category
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
      // Batch classify all ungrouped tabs
      const classifications = await Promise.all(
        ungroupedTabs.map(async (tab, index) => {
          try {
            const classification = await this.classifyTab(tab.title, tab.url);
            return {
              tab,
              classification,
              index
            };
          } catch (error) {
            console.warn(`TabClassifier: Failed to classify tab ${index}:`, error);
            return {
              tab,
              classification: this.fallbackClassification(tab.title, tab.url),
              index
            };
          }
        })
      );

      // Filter by confidence threshold and group by categories
      const validTabs = classifications.filter(item => 
        item.classification.confidence >= confidenceThreshold
      );

      console.log(`TabClassifier: ${validTabs.length} tabs passed confidence threshold`);

      // Group tabs by category
      const categoryGroups = {};
      validTabs.forEach(({ tab, classification }) => {
        const category = classification.category;
        if (!categoryGroups[category]) {
          categoryGroups[category] = {
            category,
            tabs: [],
            totalConfidence: 0,
            avgConfidence: 0
          };
        }
        categoryGroups[category].tabs.push(tab);
        categoryGroups[category].totalConfidence += classification.confidence;
      });

      // Calculate average confidence and filter by minimum group size
      const finalGroups = Object.values(categoryGroups)
        .map(group => ({
          ...group,
          avgConfidence: group.totalConfidence / group.tabs.length,
          emoji: this.getCategoryEmoji(group.category)
        }))
        .filter(group => group.tabs.length >= minGroupSize)
        .sort((a, b) => b.tabs.length - a.tabs.length) // Sort by group size
        .slice(0, maxGroups); // Limit number of groups

      // Generate group names
      const namedGroups = finalGroups.map(group => ({
        ...group,
        name: `${group.emoji} ${group.category}`,
        tabIds: group.tabs.map(tab => tab.id)
      }));

      const stats = {
        totalTabs: ungroupedTabs.length,
        processedTabs: validTabs.length,
        groupsCreated: namedGroups.length,
        totalTabsGrouped: namedGroups.reduce((sum, group) => sum + group.tabs.length, 0),
        ungroupedTabs: validTabs.length - namedGroups.reduce((sum, group) => sum + group.tabs.length, 0)
      };

      console.log(`TabClassifier: ML auto-grouping completed:`, stats);

      return {
        success: true,
        groups: namedGroups,
        stats,
        options: {
          confidenceThreshold,
          minGroupSize,
          maxGroups
        }
      };

    } catch (error) {
      console.error('TabClassifier: ML auto-grouping failed:', error);
      return {
        success: false,
        error: error.message,
        groups: [],
        stats: {
          totalTabs: ungroupedTabs.length,
          processedTabs: 0,
          groupsCreated: 0,
          totalTabsGrouped: 0,
          ungroupedTabs: ungroupedTabs.length
        }
      };
    }
  }
}

// Create and pre-initialize singleton
const tabClassifier = new TabClassifier();

// Start initialization in background (non-blocking)
tabClassifier.initialize().catch(error => {
  console.error('TabClassifier: Background initialization failed:', error);
});

export { tabClassifier };
