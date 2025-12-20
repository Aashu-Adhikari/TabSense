// Training data collection for ML model improvement
class TrainingDataCollector {
  constructor() {
    this.userCorrections = [];
    this.maxStoredCorrections = 100;
  }

  addCorrection(text, predictedLabel, correctLabel) {
    this.userCorrections.push({
      text,
      predictedLabel,
      correctLabel,
      timestamp: Date.now()
    });
    
    // Keep only recent corrections
    if (this.userCorrections.length > this.maxStoredCorrections) {
      this.userCorrections = this.userCorrections.slice(-this.maxStoredCorrections);
    }
    
    // Save to storage
    this.saveToStorage();
    
    // Train model if we have enough data
    if (this.userCorrections.length >= 10) {
      this.triggerModelTraining();
    }
  }

  getTrainingExamples() {
    return this.userCorrections.map(correction => ({
      text: correction.text,
      label: correction.correctLabel
    }));
  }

  async saveToStorage() {
    await new Promise(resolve => {
      chrome.storage.local.set({ 
        ml_training_data: this.userCorrections 
      }, resolve);
    });
  }

  async loadFromStorage() {
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['ml_training_data'], result => {
        resolve(result.ml_training_data || []);
      });
    });
    
    this.userCorrections = data;
    return data.length;
  }

  async triggerModelTraining() {
    const examples = this.getTrainingExamples();
    
    if (examples.length >= 10) {
      chrome.runtime.sendMessage({
        action: "TRAIN_MODEL",
        trainingData: examples
      }, response => {
        if (response && response.success) {
          console.log('Model retrained with user feedback');
        }
      });
    }
  }
}

export const trainingCollector = new TrainingDataCollector();