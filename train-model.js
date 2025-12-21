// train-model.js
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const MODEL_SAVE_DIR = path.join(__dirname, 'src/ml/pretrained-model');
const MODEL_SAVE_PATH = `file://${MODEL_SAVE_DIR}`;

const categories = [
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

// 1. Load and Parse the Training Data from CSV
async function loadTrainingData(filePath) {
  const examples = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (row.text && row.label) {
          examples.push({ text: row.text, label: row.label });
        }
      })
      .on('end', () => resolve(examples))
      .on('error', (err) => reject(err));
  });
}

// 2. Define the exact same model architecture as in classifier.js
function createModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [512] }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: categories.length, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}

// 3. Main training function
async function train() {
  console.log('Loading training data from training-data.csv...');
  const trainingData = await loadTrainingData('./training-data.csv');
  if (trainingData.length === 0) {
    console.error('No training data found. Exiting.');
    return;
  }
  console.log(`Loaded ${trainingData.length} examples.`);

  const texts = trainingData.map(ex => ex.text);
  const labels = trainingData.map(ex => ex.label);
  const labelIndices = labels.map(label => categories.indexOf(label));

  console.log('Loading Universal Sentence Encoder model...');
  const useModel = await use.load();

  console.log('Generating text embeddings (this may take a moment)...');
  const embeddings = await useModel.embed(texts);
  const oneHotLabels = tf.oneHot(labelIndices, categories.length);

  const model = createModel();
  model.summary();

  console.log('Starting model training...');
  await model.fit(embeddings, oneHotLabels, {
    epochs: 40, // More epochs are good for smaller datasets
    batchSize: 4,
    validationSplit: 0.1,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, acc = ${logs.acc.toFixed(4)}, val_acc = ${logs.val_acc.toFixed(4)}`);
      }
    }
  });

  console.log('Training complete.');

  // Ensure the save directory exists
  if (!fs.existsSync(MODEL_SAVE_DIR)) {
    fs.mkdirSync(MODEL_SAVE_DIR, { recursive: true });
  }

  await model.save(MODEL_SAVE_PATH);
  console.log(`✅ Model saved successfully to ${MODEL_SAVE_DIR}`);

  // Clean up tensors from memory
  embeddings.dispose();
  oneHotLabels.dispose();
}

train().catch(err => console.error('Training script failed:', err));