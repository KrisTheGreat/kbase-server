const express = require('express');
const router = express.Router();
const issue_controller = require('../controllers/issue.controller');

router.post('/create', issue_controller.issue_create);
router.post('/edit', issue_controller.issue_edit);
router.post('/delete', issue_controller.issue_delete);
router.post('/getIssueByTag', issue_controller.getIssueByTag);
router.post('/getIssueById', issue_controller.getIssueById);
router.post('/getAllTags', issue_controller.getAllTags);


module.exports = router;
