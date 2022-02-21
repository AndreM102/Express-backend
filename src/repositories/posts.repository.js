const Sequelize = require('sequelize');
const db = require('../../config/db.config');
const { responseHandler } = require('../helpers/responseHelpers');
const { isArrayEmpty, isNull } = require('../helpers/conditionalHelper');
const {
  PostsModelSequelize,
  PostTagModelSequelize,
  TagsModelSequelize,
  AnswersModelSequelize,
  CommentsModelSequelize, UsersModelSequelize,
} = require('../models/sequelize');

exports.create = async (newPost, result, tagDescription) => {
  let transaction;
  try {
    transaction = await db.transaction();

    const post = await PostsModelSequelize.create({
      title: newPost.title,
      body: newPost.body,
      user_id: newPost.user_id,
    })
      .catch((error) => {
        console.log(error);
        result(responseHandler(false, 500, 'Something went wrong', null), null);
        return null;
      });

    const [tag] = await TagsModelSequelize.findOrCreate({
      where: {
        tagname: newPost.tagname,
      },
      defaults: {
        tagname: newPost.tagname,
        description: tagDescription,
      },
    })
      .catch((error) => {
        console.log(error);
        result(responseHandler(false, 500, 'Something went wrong', null), null);
        return null;
      });

    await PostTagModelSequelize.create({
      post_id: post.id,
      tag_id: tag.id,
    })
      .catch((error) => {
        console.log(error);
        result(responseHandler(false, 500, 'Something went wrong', null), null);
        return null;
      });

    result(
      null,
      responseHandler(true, 200, 'Post Created', post.id),
    );

    await transaction.commit();
  } catch (error) {
    console.log(error);
    result(responseHandler(false, 500, 'Something went wrong', null), null);
    if (transaction) {
      await transaction.rollback();
    }
  }
};

exports.remove = async (id, result) => {
  let transaction;

  try {
    transaction = await db.transaction();

    await PostTagModelSequelize.destroy({ where: { post_id: id } });

    await AnswersModelSequelize.destroy({ where: { post_id: id } });

    await CommentsModelSequelize.destroy({ where: { post_id: id } });

    await PostsModelSequelize.destroy({ where: { id } });

    result(
      null,
      responseHandler(true, 200, 'Post Removed', null),
    );

    await transaction.commit();
  } catch (error) {
    console.log(error);
    result(responseHandler(false, 500, 'Something went wrong', null), null);
    if (transaction) {
      await transaction.rollback();
    }
  }
};

exports.retrieveOne = async (postId, result) => {
  await PostsModelSequelize.increment('views',
    {
      by: 1,
      where: { id: postId },
    })
    .catch((error) => {
      console.log('error: ', error);
      return result(
        responseHandler(
          false,
          error ? error.statusCode : 404,
          error ? error.message : 'There isn\'t any post by this id',
          null,
        ),
        null,
      );
    });

  const queryResult = await PostsModelSequelize.findOne({
    distinct: true,
    where: {
      id: postId,
    },
    attributes: [
      'id',
      'user_id',
      [Sequelize.literal('tags.id'), 'tag_id'],
      [Sequelize.literal('COUNT(DISTINCT(answers.id))'), 'answer_count'],
      [Sequelize.literal('COUNT(DISTINCT(comments.id))'), 'comment_count'],
      [Sequelize.literal('user.gravatar'), 'gravatar'],
      [Sequelize.literal('user.username'), 'username'],
      'title',
      ['body', 'post_body'],
      [Sequelize.literal('tags.tagname'), 'tagname'],
      'created_at',
      'updated_at',
      'views',
    ],
    include: [
      {
        model: TagsModelSequelize,
        required: true,
        attributes: [],
      },
      {
        model: UsersModelSequelize,
        required: true,
        attributes: [],
      },
      {
        model: AnswersModelSequelize,
        required: false,
        attributes: [],
      },
      {
        model: CommentsModelSequelize,
        required: false,
        attributes: [],
      },
    ],
  }).catch((error) => {
    console.log(error);
    return result(responseHandler(false, 500, 'Something went wrong!', null), null);
  });

  if (isNull(queryResult.dataValues.id)) {
    return result(responseHandler(false, 404, 'There isn\'t any post by this id', null), null);
  }

  return result(null, responseHandler(true, 200, 'Success', queryResult));
};

exports.retrieveAll = async (result) => {
  const queryResult = await PostsModelSequelize.findAll({
    distinct: true,
    attributes: [
      'id',
      'user_id',
      'views',
      [Sequelize.literal('user.username'), 'username'],
      [Sequelize.literal('user.gravatar'), 'gravatar'],
      [Sequelize.literal('tags.id'), 'tag_id'],
      [Sequelize.literal('tags.tagname'), 'tagname'],
      'created_at',
      'updated_at',
      'title',
      'body',
      [Sequelize.literal('COUNT(DISTINCT(answers.id))'), 'answer_count'],
      [Sequelize.literal('COUNT(DISTINCT(comments.id))'), 'comment_count'],
    ],
    include: [
      {
        model: TagsModelSequelize,
        required: true,
        attributes: [],
      },
      {
        model: UsersModelSequelize,
        required: true,
        attributes: [],
      },
      {
        model: AnswersModelSequelize,
        required: false,
        attributes: [],
      },
      {
        model: CommentsModelSequelize,
        required: false,
        attributes: [],
      },
    ],
    group: ['id'],
    order: [['created_at', 'DESC']],
  }).catch((error) => {
    console.log(error);
    return result(responseHandler(false, 500, 'Something went wrong!', null), null);
  });

  if (isArrayEmpty(queryResult)) {
    return result(responseHandler(false, 404, 'There are no posts', null), null);
  }

  return result(null, responseHandler(true, 200, 'Success', queryResult));
};

exports.retrieveAllTop = async (result) => {
  const queryResult = await PostsModelSequelize.findAll({
    distinct: true,
    attributes: [
      'id',
      'user_id',
      'views',
      [Sequelize.literal('user.username'), 'username'],
      [Sequelize.literal('user.gravatar'), 'gravatar'],
      [Sequelize.literal('tags.id'), 'tag_id'],
      [Sequelize.literal('tags.tagname'), 'tagname'],
      'created_at',
      'updated_at',
      'title',
      'body',
      [Sequelize.literal('COUNT(DISTINCT(answers.id))'), 'answer_count'],
      [Sequelize.literal('COUNT(DISTINCT(comments.id))'), 'comment_count'],
    ],
    include: [
      {
        model: TagsModelSequelize,
        required: true,
        attributes: [],
      },
      {
        model: UsersModelSequelize,
        required: true,
        attributes: [],
      },
      {
        model: AnswersModelSequelize,
        required: false,
        attributes: [],
      },
      {
        model: CommentsModelSequelize,
        required: false,
        attributes: [],
      },
    ],
    group: ['id'],
    order: [
      [Sequelize.literal('answer_count DESC')],
      [Sequelize.literal('comment_count DESC')],
    ],
  }).catch((error) => {
    console.log(error);
    return result(responseHandler(false, 500, 'Something went wrong!', null), null);
  });

  if (isArrayEmpty(queryResult)) {
    return result(responseHandler(false, 404, 'There are no posts', null), null);
  }

  return result(null, responseHandler(true, 200, 'Success', queryResult));
};

exports.retrieveAllTag = async (tagName, result) => {
  const queryResult = await PostsModelSequelize.findAll({
    where: {
      '$tags.tagname$': tagName,
    },
    distinct: true,
    attributes: [
      'id',
      'user_id',
      'views',
      [Sequelize.literal('user.username'), 'username'],
      [Sequelize.literal('user.gravatar'), 'gravatar'],
      [Sequelize.literal('tags.id'), 'tag_id'],
      [Sequelize.literal('tags.tagname'), 'tagname'],
      'created_at',
      'updated_at',
      'title',
      'body',
      [Sequelize.literal('COUNT(DISTINCT(answers.id))'), 'answer_count'],
      [Sequelize.literal('COUNT(DISTINCT(comments.id))'), 'comment_count'],
    ],
    include: [
      {
        model: TagsModelSequelize,
        required: true,
        attributes: [],
      },
      {
        model: UsersModelSequelize,
        required: true,
        attributes: [],
      },
      {
        model: AnswersModelSequelize,
        required: false,
        attributes: [],
      },
      {
        model: CommentsModelSequelize,
        required: false,
        attributes: [],
      },
    ],
    group: ['id'],
    order: [['created_at', 'DESC']],
  }).catch((error) => {
    console.log(error);
    return result(responseHandler(false, 500, 'Something went wrong!', null), null);
  });

  if (isArrayEmpty(queryResult)) {
    return result(responseHandler(false, 404, 'There are no posts', null), null);
  }

  return result(null, responseHandler(true, 200, 'Success', queryResult));
};
