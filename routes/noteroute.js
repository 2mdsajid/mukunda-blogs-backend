const express = require("express");
let app = express();
const router = express.Router();
const dbConnection = require("../db/mongo");

const Note = require("../schema/noteSchems");
const Feedback = require("../schema/feedbackSchema");
const Admin = require("../schema/adminSchema");
const UnsubNotific = require("../schema/unsubscribeNotification");

// nodemailer cofnigurration
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

/*  ADDING NOTES TO DATABASE */
router.post("/savenote", async (req, res, next) => {
  try {
    // Get the request body parameters
    const {
      id,
      title,
      noteid,
      category,
      subcategory,
      intro,
      content,
      keywords,
      readtime,
      introimage,
    } = req.body;

    let newnote;

    if (id) {
      newnote = await Note.findById(id);
    }

    if (newnote) {
      // Update existing note
      newnote.title = title;
      newnote.noteid = noteid;
      newnote.category = category;
      newnote.subcategory = subcategory || "";
      newnote.intro = intro;
      newnote.review = false;
      newnote.published = true;
      newnote.content = content;
      newnote.keywords = keywords || "";
      newnote.readtime = readtime;
      newnote.introimage = introimage;
      newnote.isupdated.state = true;

      const saved = await newnote.save();
    } else {
      // Create new note
      newnote = new Note({
        title,
        noteid,
        category,
        subcategory: subcategory || "",
        intro,
        content,
        review: false,
        published: true,
        keywords: keywords || "",
        readtime,
        introimage,
      });
      await newnote.save();
    }

    // Handle success response

    console.log("newnote");
    return res.status(200).json({
      message: "Note saved successfully",
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    // Handle error response
    return res.status(500).json({
      message: "Error saving note",
      status: 500,
      meaning: "internalerror",
      error: error.message,
    });
  }
});

/*  ADDING NOTES TO DRAFT */
router.post("/savedraft", async (req, res, next) => {
  // Get the request body parameters
  const {
    id,
    title,
    noteid,
    category,
    subcategory,
    intro,
    content,
    keywords,
    readtime,
    introimage,
  } = req.body;

  let newnote;

  try {
    if (id) {
      newnote = await Note.findById(id);
    }

    if (newnote) {
      // Update existing note
      console.log("old");
      newnote.title = title;
      newnote.noteid = noteid;
      newnote.category = category;
      newnote.subcategory = subcategory || "";
      newnote.intro = intro;
      newnote.review = true;
      newnote.published = false;
      newnote.content = content;
      newnote.keywords = keywords || "";
      newnote.readtime = readtime;
      newnote.introimage = introimage;
      newnote.isupdated.state = true;

      const saved = await newnote.save();
    } else {
      // Create new note
      console.log("new");
      newnote = new Note({
        title,
        noteid,
        category,
        subcategory: subcategory || "",
        intro,
        content,
        review: true,
        published: false,
        keywords: keywords || "",
        readtime,
        introimage,
      });

      await newnote.save();
    }

    return res.status(200).json({
      message: "Note drafted successfully",
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internal server error",
    });
  }
});

// add replies
const { ObjectId } = require("mongodb");
router.post("/addreply", async (req, res) => {
  try {
    let { noteid, commentid, name, email, reply } = req.body;

    // Checking for reply, it is compulsory
    if (!reply) {
      return res.status(400).json({
        message: "Reply is a required field",
        status: 400,
        meaning: "badrequest",
      });
    }

    const note = await Note.findOne({ _id: noteid });

    // Find the comment with the given commentId
    const commentId = new ObjectId(commentid);
    const comment = await note.comments.find(
      (comment) => comment._id.toString() === commentId.toString()
    );

    // If the comment is not found, return an error response
    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
        status: 404,
        meaning: "notfound",
      });
    }

    // Push the new reply into the replies array of the comment
    comment.replies.push({
      name: name || "reader",
      email: email || "",
      reply,
    });

    const savedNote = await note.save();

    const newUnsubNotific = await UnsubNotific.findOne({
      _id: "64a517b3eb022d8fb7dc65d7",
    });
    if (!newUnsubNotific.email.includes(email)) {
      // mail notification
      const mailOptions = {
        from: "livingasrb007@gmail.com",
        to: comment.email,
        subject: "Reply On Your Comment",
        html: `<div style="background-color:#F8FAFC;padding:20px">
            <div style="background-color:#FFFFFF;border-radius:16px;padding:20px;text-align:center">
              <img src="https://example.com/logo.png" alt="Friday Soup Logo" style="width: 128px">
              <h2 style="font-size:28px;font-weight:bold;margin:24px 0 16px">Website Comment Reply Notification</h2>
              <p style="font-size:16px;margin-bottom:32px">
                Hi ${comment.name},<br>
                You have received a reply on your comment on our website. Click the link below to view the comment and continue the conversation:
                <br><br>
                <a href="https://aayushmakafle.com.np/${note.noteid}" style="color:#0066CC;text-decoration:underline">View Comment Reply</a>
              </p>
              <p style="font-size:12px;color:#999999">
                To unsubscribe from this notification, click <a href="https://aayushmakafle.com.np/unsubscribe/mailnotification/${comment.email}" style="color:#999999;text-decoration:underline">here</a>.
              </p>
            </div>
          </div>
          `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}`);
      } catch (error) {
        if (error.message.includes("Invalid recipient")) {
          console.log(`Wrong email address: ${email}`);
        } else {
          console.log(error);
        }
      }
    }

    if (savedNote) {
      res.status(201).json({
        message: "Reply added successfully",
        savedNote,
        status: 201,
        meaning: "created",
      });
    } else {
      res.status(400).json({
        message: "Unable to add the reply",
        status: 400,
        meaning: "badrequest",
      });
    }
  } catch (error) {
    res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// ADDING COMMENTS TO THE NOTE
router.post("/addcomment", async (req, res) => {
  try {
    let { id, name, email, comment } = req.body;

    // checking for comment , it is compulsory
    if (!comment) {
      return res.status(400).json({
        message: "Comment is a required field",
        status: 400,
        meaning: "badrequest",
      });
    }

    const note = await Note.findOne({ _id: id });
    note.comments.push({
      name: name || "reader",
      email: email || "",
      comment,
    });

    const savednote = await note.save();

    if (savednote) {
      res.status(201).json({
        message: "Comment addded successfully",
        status: 201,
        meaning: "created",
      });
    } else {
      res.status(400).json({
        message: "Unable to add the comment",
        status: 400,
        meaning: "badrequest",
      });
    }
  } catch (error) {
    res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});


router.get("/getnotebynoteid/:noteid", async (req, res) => {
  try {
    const { noteid } = req.params
    console.log("🚀 ~ file: noteroute.js:323 ~ router.get ~ noteid:", noteid)
    const note = await Note.findOne({ noteid })

    // if note is not there, return the whole process without any data
    if (!note) {
      return res.status(400).json({
        message: "Unable to fetch the note! Check your credentials",
        status: 400,
        meaning: "badrequest",
      });
    }
    res.status(200).json({
      note,
      message: "Note fetched successfully",
      status: 200,
      meaning: "ok",
    })
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    })
  }
})

router.get("/getnotebyid/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ _id: id });

    // if note is not there, return the whole process without any data
    if (!note) {
      return res.status(400).json({
        message: "Unable to fetch the note! Check your credentials",
        status: 400,
        meaning: "badrequest",
      });
    }

    res.status(200).json({
      note,
      message: "Note fetched successfully",
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// get all note of the category
router.post("/getnotesbycategory", async (req, res) => {
  try {
    const { category } = req.body;
    const notes = await Note.find({ category: category, review: false }).select(
      "_id title noteid intro date readtime introimage"
    );

    if (!notes || notes.length === 0) {
      return res.status(400).json({
        message: "Unable to fetch the notes of this category",
        status: 400,
        meaning: "badrequest",
      });
    }

    res.status(200).json({
      notes,
      message: "Category notes fetched successfully",
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// const User = mongoose.model('User', User);
router.get("/getrecentnotes", async (req, res) => {
  try {
    const allnotes = await Note.find({ review: false, published: true })
      .sort({ date: -1 }) // Sort by createdAt field in descending order
      .limit(6) // Return only the latest 6 notes
      .exec(); // Execute the query to get the notes

    if (!allnotes) {
      return res.status(400).json({
        message: "Unable to fetch the notes",
        status: 400,
        meaning: "badrequest",
      });
    }

    const reversedNotes = allnotes.reverse();

    return res.status(200).json({
      notes: reversedNotes,
      message: "note fetched successfully",
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// get all notes --- published, not published, drafted
router.get("/getallnotes", async (req, res) => {
  try {
    const notes = await Note.find({ review: false, published: true });
    if (!notes) {
      return res.status(400).json({
        message: "Unable to fetch the notes",
        status: 400,
        meaning: "badrequest",
      });
    }

    return res.status(200).json({
      notes,
      message: "note fetched successfully",
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// transformed notes
// to get all the notes in the draft
router.get('/gettransformednotes', async (req, res) => {
  try {
      const allnotes = await Note.find();

      if (!allnotes) {
          return res.status(400).json({
              message: 'Unable to fetch the draft notes',
              status: 400,
              meaning: 'badrequest'
          });
      }

      const transformedNotes = allnotes.map((note) => ({
          _id: note._id,
          title: note.title,
          commentslength: note.comments.length,
          views: note.views,
          category: note.category,
          upvotes: note.upvote.length,
          isupdated: note.isupdated,
          intro: note.intro,
          noteid: note.noteid,
          date: note.date,
          review: note.review,
          published: note.published
      }));

      return res.status(200).json({
          notes: transformedNotes,
          message: 'Draft notes fetched successfully',
          status: 200,
          meaning: 'ok'
      });
  } catch (error) {
      return res.status(501).json({
          message: error.message,
          status: 501,
          meaning: 'internalerror'
      });
  }
});


// to get all the notes in the draft
router.get("/getreviewnotes", async (req, res) => {
  try {
    const reviewnotes = await Note.find({ review: true });
    if (!reviewnotes) {
      return res.status(400).json({
        message: "Unable to fetch the review notes",
        status: 400,
        meaning: "badrequest",
      });
    }

    return res.status(200).json({
      reviewnotes,
      message: "review note fetched successfully",
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// delete a  note
router.post("/deletenote", async (req, res) => {
  const { id } = req.body;
  try {
    const noteToDelete = await Note.findById(id);
    // return res.status(200).json({
    //     message: 'Note deleted successfully',
    //     note: noteToDelete,
    //     status: 200,
    //     meaning: 'ok'
    // });

    if (!noteToDelete) {
      return res.status(404).json({
        message: "Note not found",
        status: 404,
        meaning: "notfound",
      });
    }

    await Note.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Note deleted successfully",
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// publishing the note from the draft
router.post("/changereview", async (req, res) => {
  try {
    const { id } = req.body;
    const note = await Note.findOne({ _id: id });

    if (!note) {
      return res.status(400).json({
        message: "Can't find a note",
        status: 400,
        meaning: "badrequest",
      });
    }

    note.review = true; //dont use AWAIT while updating any state in database
    const savednote = await note.save();

    res.status(201).json({
      message: "Note Approved successfully",
      savednote,
      status: 201,
      meaning: "created",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});


// add likes
router.post("/addvote", async (req, res) => {
  try {
    const { id, uniqueid } = req.body;
    const note = await Note.findOne({ _id: id });

    if (note) {
      if (note.upvote.includes(uniqueid)) {
        note.upvote.pull(uniqueid);
      } else {
        note.upvote.push(uniqueid);
      }
    }
    await note.save();

    return res.status(201).json({
      message: "voted successfully",
      status: 201,
      upvote:note.upvote,
      meaning: "created",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// add comments liks
router.post("/addcommentvote", async (req, res) => {
  try {
    const { commentid, noteid, uniqueid } = req.body;

    const note = await Note.findOne({ _id: noteid });

    if (note) {
      const commentId = new ObjectId(commentid);
      const comment = await note.comments.find(
        (comment) => comment._id.toString() === commentId.toString()
      );

      if (comment) {
        const { likes } = comment;
        if (likes.includes(uniqueid)) {
          comment.likes = likes.filter((id) => id !== uniqueid);
        } else {
          comment.likes.push(uniqueid);
        }
      }
    }

    await note.save();

    return res.status(201).json({
      message: "Vote added successfully",
      comments: note.comments,
      status: 201,
      meaning: "created",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// add feedback and mail it to the owner
router.post("/addfeedback", async (req, res) => {
  try {
    const { name, email, feedback } = req.body;

    const newfeedback = new Feedback({
      email,
      name: name || "",
      feedback,
    });

    await newfeedback.save();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: "Website Feedback From a Visitor",
      html: `<div style="background-color:#F8FAFC;padding:32px">
            <div style="background-color:#FFFFFF;border-radius:16px;padding:32px;text-align:center">
              <h2 style="font-size:28px;font-weight:bold;margin:0 0 16px">Feedback</h2>
              <p style="font-size:16px;margin-bottom:16px">Name: ${name}</p>
              <p style="font-size:16px;margin-bottom:16px">Email: ${email}</p>
              <p style="font-size:16px;margin-bottom:32px">Feedback: ${feedback}</p>
            </div>
          </div>
          `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
    } catch (error) {
      if (error.message.includes("Invalid recipient")) {
        console.log(`Wrong email address: ${email}`);
      } else {
        console.log(error);
      }
    }

    res.status(201).json({
      message: "feedback received ",
      status: 201,
      meaning: "created",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// get visitors
router.get("/getstatistics", async (req, res) => {
  try {
    //notes
    const notes = await Note.find();
    const viewssum = notes
      .map((note) => note.views)
      .reduce((acc, curr) => acc + curr, 0);
    const highestViewNote = notes.reduce((prevNote, currNote) => {
      if (currNote.views > prevNote.views) {
        return currNote;
      }
      return prevNote;
    });
    const { title, noteid, views } = highestViewNote;
    const highestviewnote = { title, noteid, views };

    return res.status(201).json({
      message: "visitor added ",
      viewssum,
      highestviewnote,
      status: 201,
      meaning: "created",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});



// adminlogin
router.post("/adminlogin", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find admin with matching username and password
    const admin = await Admin.findOne({ username, password });
    if (admin) {
      res.status(200).json({
        isAdmin: true,
        message: "Admin login successful",
      });
    } else {
      // Admin not found
      res.status(401).json({
        isAdmin: false,
        message: "Invalid username or password",
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Error occurred while finding admin" });
  }
});

// add views
router.post("/addviews", async (req, res) => {
  console.log(req.body.id);

  try {
    const { id } = req.body;
    const note = await Note.findOne({ _id: id });
    if (!note) {
      return null;
    }
    note.views = note.views + 1;
    await note.save();
    return res.status(201).json({
      message: "voted successfully",
      status: 201,
      meaning: "created",
    });
  } catch (error) {
    return res.status(501).json({
      message: error.message,
      status: 501,
      meaning: "internalerror",
    });
  }
});

// unsubs mails
router.post("/addunsubnotificemail", async (req, res) => {
  try {
    const { email } = req.body;
    const newUnsubNotific = await UnsubNotific.findOne({
      _id: "64a517b3eb022d8fb7dc65d7",
    });
    if (!newUnsubNotific.email.includes(email)) {
      newUnsubNotific.email.push(email);
      await newUnsubNotific.save();
      return res.status(201).json({
        message: "Email added successfully",
        unsubs: newUnsubNotific.email,
      });
    }
    return res.status(201).json({ message: "Email already unsubscribed" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add email",
      error: error.message,
    });
  }
});

module.exports = router;
