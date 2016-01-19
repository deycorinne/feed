var mongoose = require('mongoose');
var Talk = require('../models/Talk');
var Industry = require('../models/Industry');
var Follow = require('../models/Follow');
var User = require('../models/User');
var Vote = require('../models/Vote');
var FeedItem = require('../models/FeedItem');
var async = require('async');
var Q = require('q');
var _ = require('underscore');

var FEED_ACCURACY = 50; // number of talks allowed directly corresponds with feed accuracy

/** UNDER CONSTRUCTION
PLANS---
  VISIBILTIY = (INTEREST)(TALK PERFORMANCE)(CREATOR PERFORMANCE)(RECENCY)
  1. Interest:
      * does the user follow the industry of this talk?
      * is the user in the industry of the talk?
  2. Post performance:
      * How many people are/were attending this talk?
      * How many likes does this talk have?
      * How many views?
  3. Creator performance:
      * Does this person have any past posts? If soooo....
      * How well did those perform? (see above questions)
 4. Recency:
      * Live always at the top
      * sort by endDate
**/


exports.get = function(req, res) {
  if (!_.isString(req.query.feedId)) {
    var error = 'Please include a feed ID with your request';
    return res.status(500).json({
      errors: [{
        title: error
      }]
    })
  }

  var perPage = req.query.perPage || 6;
  var query = {
    feedId: req.query.feedId
  };

  if (req.session.user) {
    query.owner = req.session.user;
  }

  // feedId will be different each time, find all feed items for current id
  FeedItem.find(query).exec(function(err, feedItems) {
    if (err) {
      return res.status(500).json({
        errors: [{
          title: 'Could not get feed items for user feed'
        }]
      })
    }

    if (!_.isArray(feedItems)) {
      return res.status(404).json({
        errors: [{
          title: "Feed items could not be found"
        }]
      })
    }

    var ids = feedItems.map(function(feedItem) {
      return feedItem.talk
    });

    // get all talks with endDate & not already feed items
    Talk.find({
      _id: {
        $nin: ids
      },
      industry: {
        $exists: true
      }
    }).sort({
      'endDate': -1
    }).limit(FEED_ACCURACY).exec(function(err, talks) {
      if (err) {
        return res.status(500).json({
          errors: [{
            title: 'Could not get talks for user feed'
          }]
        })
      }

      if (!_.isArray(talks)) {
        return res.status(404).json({
          errors: [{
            title: 'Problem getting talks for user feed'
          }]
        })
      }

      if (talks.length === 0) {
        return res.status(200).json({
          data: []
        });
      }

      async.parallel({
        userIndustries: function(cb) {
          if (req.session.user) {
            getUserIndustryIds(req.session.user).then(function(result) {
              if (result.length > 0) {
                async.each(talks, function(talk, callback) {
                  var temp = talk.industry.toString();
                  if (result.indexOf(temp) > -1) {
                    talk['rank'] = talk['rank'] + 1;
                  }
                  callback();
                }, function(err) {
                  if (err) {
                    return cb({
                      status: 500,
                      title: 'There was an error ranking talks by user industry'
                    });
                  }
                  cb(null, talks);
                });
              } else {
                cb(null, []); // no industries to rank
              }
            }).catch(function(err) {
              return cb({
                status: 500,
                title: err
              });
            });
          } else {
            cb(null, []); // send empty array bc no industries
          }
        },
        userFollows: function(cb) {
          if (req.session.user) {
            getUserIndustryFollows(req.session.user).then(function(result) {
              if (result.length > 0) {
                async.each(talks, function(talk, callback) {
                  var temp = talk.industry.toString();
                  if (result.indexOf(temp) > -1) {
                    talk['rank'] = talk['rank'] + 1;
                  }
                  callback();
                }, function(err) {
                  if (err) {
                    return cb({
                      status: 500,
                      title: 'There was an error ranking talks by user industry follows'
                    });
                  }
                  cb(null, talks);
                });
              } else {
                cb(null, []); // no following industries to rank
              }
            }).catch(function(err) {
              return cb({
                status: 500,
                title: err
              });
            });
          } else {
            cb(null, []);
          }
        },
        votes: function(cb) {
          async.each(talks, function(talk, callback) {
            if (talk.votes > 0) {
              talk['rank'] = talk['rank'] + 2;
            } else if (talk.votes === 0) {
              talk['rank'] = talk['rank'] + 1;
            } else if (talk.votes < 0) {
              talk['rank'] = talk['rank'] + 0;
            }
            callback();
          }, function(err) {
            if (err) {
              return cb({
                status: 500,
                title: 'There was an error ranking talks by votes'
              });
            }
            cb(null, talks);
          });
        },
        attendees: function(cb) {
          async.each(talks, function(talk, callback) {
            if (talk.attendees > 0) {
              talk['rank'] = 2;
            } else if (talk.attendees === 0) {
              talk['rank'] = 1;
            } else if (talk.attendees < 0) {
              talk['rank'] = 0;
            }
            callback();
          }, function(err) {
            if (err) {
              return cb({
                status: 500,
                title: 'There was an error ranking talks by attendees'
              });
            }
            cb(null, talks);
          });
        }
      }, function(err, results) {
        if (err) {
          return res.status(err.status).json({
            errors: [{
              title: err.title
            }]
          })
        }

        sortTalks(talks);
        var subArray = talks.slice(0, perPage);

        createFeedItems(subArray, req.query.feedId, req.session.user).then(function(result) {
          return res.status(200).json({
            data: result
          });
        }).catch(function(err) {
          return res.status(500).json({
            errors: [{
              title: 'There was an error generating this feed.'
            }]
          })
        });
      });
    });
  });
}


function createFeedItems(talks, feedId, activeUser) {
  var deferred = Q.defer();
  async.each(talks, function(talk, callback) {
      var feedItem = new FeedItem({
        talk: talk._id,
        feedId: feedId
      });
      if (activeUser) {
        feedItem.owner = activeUser;
      }
      feedItem.save(function(err, feedItem) {
        if (err) {
          return deferred.reject(new Error('There was a problem saving feed items.'));
        }
        callback();
      });
    },
    function(err) {
      if (err) {
        return deferred.reject('There was a problem creating feed items.');
      }
      deferred.resolve(talks);
    });
  return deferred.promise;
}

function getUserIndustryIds(userId) {
  var deferred = Q.defer();
  User.findOne({
    _id: userId
  }).exec(function(err, user) {
    if (err || !_.isObject(user)) {
      return deferred.reject('There was a problem finding the user.');
    }
    var result = [];
    result = user.industries.map(function(industry) {
      return industry.toString();
    });
    deferred.resolve(result);
  });
  return deferred.promise;
}

function getUserIndustryFollows(userId) {
  var deferred = Q.defer();
  Follow.find({
    owner: userId,
    industry: {
      $exists: true
    }
  }).exec(function(err, follows) {
    if (err || !_.isArray(follows)) {
      return deferred.reject('There was a problem finding the indsutries this user follows.');
    }
    var result = [];
    result = follows.map(function(follow) {
      return follow.industry.toString();
    });
    deferred.resolve(result);
  });
  return deferred.promise;
}

function sortTalks(talks) {
  return talks = talks.sort(function(a, b) {
    if (a.rank < b.rank)
      return 1
    if (a.rank > b.rank)
      return -1
    return 0
  });
}
