const Issue = require("../models/issue.model");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Stats = require("../models/stats.model");
let multer = require("multer");
const express = require("express");
const db = require("../config/db.js");
const conf = require("../config/conf.js");

exports.getStats = (req, res) => {
  Stats.findOne({}, function (err, docs) {
    res.send(docs);
  });
};

exports.getCollectionCount = (req, res) => {
  let tag_count;
  let issue_count;
  let descending_tags;

  Issue.countDocuments({}, function (err, count) {
    issue_count = count;

    Issue.find({}, "tags", function (err, docs) {
      if (err) {
        res.send(err);
      }
      if (docs) {
        var arr2 = [];
        var obj = {};
        var unique_arr;
        let arr3 = [];
        let tag = [];

        docs.map((item) => {
          item.tags.forEach((a) => {
            arr2.push(a);
          });
        });

        let unique = [...new Set(arr2)];
        tag_count = unique.length;

        let j = 0;
        let occurrences;
        unique.map((item) => {
          arr2.forEach((i) => {
            if (i === item) {
              j = j + 1;
            }
          });
          tag.push({ name: item, occurrences: j });
          j = 0;
        });

        descending_tags = tag.sort((x, y) => {
          return y.occurrences - x.occurrences;
        });

        if (descending_tags.length > 5) {
          descending_tags = descending_tags.slice(0, 5);
        }
      } else {
        tag_count = 0;
      }

      //saving to db!
      let stats = new Stats({
        tag_count: tag_count,
        issue_count: issue_count,
        top_tags: descending_tags,
      });

      Stats.findOne({}, function (err, docs) {
        if (err) {
        }
        if (docs) {
          Stats.updateOne(
            { _id: docs._id },
            {
              tag_count: tag_count,
              issue_count: issue_count,
              top_tags: descending_tags,
            },
            function (req, res) {}
          );
        } else {
          console.log("no docs found!");
          stats.save((err) => {
            if (err) {
              console.log(err);
            } else {
              stats.save((err) => {
                if (err) {
                  console.log(err);
                } else {
                }
              });
            }
          });
        }
      });
    });
  });
};

exports.is_owner = function (req, res) {
  let owner = "";

  Issue.findById(req.body.id, function (err, issue) {
    if (err) {
      console.log(err);
      res.sendStatus(399);
      return;
    }

    owner = issue.creator_id;

    User.findOne({ username: issue.username }, function (err, user) {
      if (err) {
        res.sendStatus(400);
        return;
      }

      if (res.locals.id !== owner && !res.locals.is_admin) {
        res.sendStatus(405);
        return;
      } else {
        res.sendStatus(200);
      }
    });
  });
};

exports.issue_edit = function (req, res) {
  let owner = "";

  Issue.findById({ _id: req.body.id }, function (err, issue) {
    if (err) {
      res.sendStatus(404);
      return;
    }

    User.findOne({ _id: issue.creator_id }, function (err, user) {
      if (err) {
        res.sendStatus(404);
        return;
      }
      owner = user.username;
      if (res.locals.username !== owner && !res.locals.is_admin) {
        res.sendStatus(405);
        return;
      }

      let object = {
        title: req.body.title,
        body: req.body.body,
        tags: req.body.tags,
        edit_timestamp: Date.now(),
        editor_id: res.locals.id,
        images: req.body.images,
      };

      Issue.updateOne({ _id: req.body.id }, object, (err, docs) => {
        if (err) {
          res.send(err).end();
        }
        res.send(docs);
      });
    });
  });
};

exports.issue_create = function (req, res) {
  let problem = new Issue({
    title: req.body.title,
    body: req.body.body,
    tags: req.body.tags,
    create_timestamp: Date.now(),
    creator_id: res.locals.id,
    edit_timestamp: "",
    editor_id: "",
    images: req.body.images,
  });

  problem.save(function (err) {
    if (err) {
      console.log(err);
      res.send(err);
      //return next(err);
    } else {
      res.send('{ "text": "Problem added"}');
    }
  });
};

exports.getIssueByTag = function (req, res) {
  Issue.find({ tags: { $all: req.body.tags } }, function (err, docs) {
    if (err) {
      res.send(err);
    }
    if (docs) {
      ProcessArray(docs).then((data) => {
        res.send(data);
      });
    } //docs
  });
}; //funct

ProcessArray = async (docs) => {
  return Promise.all(docs.map((item) => ProcessItem(item)));
};

ProcessItem = async (item) => {
  let creator = await GetOwnerName(item.creator_id);
  let editor = "";
  if (item.editor_id !== "") {
    editor = await GetOwnerName(item.editor_id);
  } else {
    editor = "";
  }

  return {
    tags: item.tags,
    _id: item._id,
    title: item.title,
    body: item.body,
    create_timestamp: item.create_timestamp,
    creator: creator,
    edit_timestamp: item.edit_timestamp,
    editor: editor,
    images: item.images,
  };
};

GetOwnerName = async (id) => {
  return new Promise(function (resolve, reject) {
    User.findById({ _id: id }, function (err, docs) {
      if (err) {
        console.log("error: ", err);
      } else {
        if (docs) {
          resolve(docs.username);
        } else {
          resolve("użytkownik usunięty");
        }
      }
    });
  });
};

exports.getAllIssues = function (req, res) {
  Issue.find({}, {}, function (err, docs) {
    ProcessArray(docs).then((data) => {
      res.send(data);
    });
  });
};

exports.getAllTags = function (req, res) {
  Issue.find({}, { tags: 1 }, function (err, docs) {
    if (err) {
      res.send(err);
    }
    if (docs) {
      var arr2 = [];
      var obj = {};
      var unique_arr;

      docs.map((item) => {
        item.tags.forEach((a) => {
          arr2.push(a);
        });
      });

      let unique = [...new Set(arr2)];

      res.send(unique);
    } else {
      res.send("not found");
    }
  });
};

exports.changeImageUrlBase = async (req, res) => {
  await Issue.find({ images: { $exists: true, $ne: [] } }, function (
    err,
    docs
  ) {
    // retdurns docs withs imagexs
    if (err) {
      res.send(err);
    }
    this.AsyncFindAndChangeLinks(
      docs,
      /https?\:\/\/\w+(\.\w+)*\:?\w*.?\w*\/uploads\//g,
      conf().server_url_base + "uploads/"
    )
      .then((val) => {})
      .catch();
  });
};

AsyncFindAndChangeLinks = async (docs, old_urlbase, new_urlbase) => {
  await docs.map((doc) => {
    if (old_urlbase !== new_urlbase) {
      doc.body = doc.body.replace(old_urlbase, new_urlbase);
      //console.log(doc.body);
    }
    doc.save();
  });
  return true;
};

exports.purgeOrphanedImages = async (req, res) => {
  await Issue.find({ images: { $exists: true, $ne: [] } }, "images", function (
    err,
    docs
  ) {
    if (err) {
      res.send(err);
    }
    if (docs) {
      var a = [];
      docs.map((i) => {
        a = a.concat(i.images);
      });
      // var a - complete array of images
      var fs = require("fs");
      fs.readdir("uploads/", (err, items) => {
        if (err) {
          return;
        }
        if (items) {
          items.map((i) => {
            if (!a.includes(i)) {
              fs.unlink("uploads/" + i, (err) => {});
            }
          });
        }
      });
    }
    return 1;
  });
};

exports.getIssueById = function (req, res) {
  Issue.findById({ _id: req.body.id }, function (err, docs) {
    if (err) {
      res.send(err);
    }
    if (docs) {
      ProcessArray([docs]).then((data) => {
        res.send(data);
      });
    } else {
      res.sendStatus(404);
    }
  });
};

(exports.issue_delete = function (req, res, next) {
  let owner = "";

  Issue.findById({ _id: req.body.id }, function (err, issue) {
    if (err) {
      res.sendStatus(404);
      return;
    }

    User.findOne({ _id: issue.creator_id }, function (err, user) {
      if (err) {
        //res.sendStatus(404);

        //return;
      }
      if(owner) {
      owner = user.username;
    } else {
      owner = 'usuniety';
    }

      if (res.locals.username !== owner && !res.locals.is_admin) {
        res.sendStatus(405);
        return;
      }

      issue.remove({ _id: req.body.id });
      res.sendStatus(200);
    });
  });
}),
  (err, req, res) => {
    console.log(err);
  };
