var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var VoteSchema = new Schema({
  owner: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  talk: {
    type: Schema.ObjectId,
    ref: 'Talk',
    required: true
  },
  value: {
    type: Number,
    required: true,
    default: 0
  }
});

module.exports = mongoose.model('Vote', VoteSchema);
