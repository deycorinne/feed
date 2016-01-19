var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var FeedItemSchema = new Schema({
  talk: {
    type: Schema.ObjectId,
    ref: 'Talk',
    required: true
  },
  owner: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  feedId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('FeedItem', FeedItemSchema);
