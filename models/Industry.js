var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var IndustrySchema = new Schema({
  title: {
    type: String,
    required: true
  },
  shortTitle: {
    type: String,
    required: true,
    unique: true
  },
  queryTitle: {
    type: String,
    required: true,
    unique: true
  }
});

module.exports = mongoose.model('Industry', IndustrySchema);
