var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var FollowSchema = new Schema({
  owner: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  industry: {
    type: Schema.ObjectId,
    ref: 'Industry'
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  following: {
    type: Boolean,
    required: true
  }
});

module.exports = mongoose.model('Follow', FollowSchema);
