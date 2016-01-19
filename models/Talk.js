var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var TalkSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  owner: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  industry: {
    type: Schema.ObjectId,
    ref: 'Industry',
    required: true
  },
  votes: {
    type: Number,
    required: true,
    default: 0
  },
  attendees: {
    type: Number,
    required: true,
    default: 0
  },
  endDate: {
    type: Date
  }
});

module.exports = mongoose.model('Talk', TalkSchema);
