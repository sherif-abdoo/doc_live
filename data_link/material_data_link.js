const sequelize = require('../config/database');
const Admin = require('../models/admin_model');
const Student = require('../models/student_model');
const asyncWrapper = require('../middleware/asyncwrapper');
const Material = require('../models/material_model');
const Topic = require('../models/topic_model');
const { Op } = require("sequelize");

Material.belongsTo(Admin, { foreignKey: "publisher" });
Material.belongsTo(Topic, { foreignKey: 'topicId' });

function createMaterial (title, description, document, topicId, publisher, uploadDate) {
    return Material.create({title, description, document, topicId, publisher, uploadDate});
} 

function getMaterialById(materialId) {
    return Material.findOne({where : {materialId},
    include: [
        { model: Admin, attributes: ["group"] },
        { model: Topic, attributes: ['subject'] }
    ],
    attributes: {include : [['materialId', 'id']]}});
}

async function getAllMaterialsByGroup(group) {
    return await Material.findAll({
        include: [
            {
                model: Admin,
                attributes: ["group"],
                where: {
                    [Op.or]: [
                        { group: group },
                        { group: "all" }
                    ]
                }
            },
            { model: Topic, attributes: ['subject'] }
        ],
        attributes:{include : [['materialId', 'id']]} ,
        order: [['materialId', 'DESC']]});
    }

async function getMaterialsByTopicId(topicId) {
    return await Material.findAll({ where: { topicId },
    include: [
        { model: Admin, attributes: ["group"] },
        { model: Topic, attributes: ['subject'] }
    ],
     attributes:{include : [['materialId', 'id']]} });
}

function updateMaterial(materialId, updateData) {
    return Material.update(updateData, { where: { materialId } });
}

function deleteMaterial(materialId) {
    return Material.destroy({ where: { materialId } });
}

async function getMaterialByTopicId(topicId) {
    return await Material.findAll({
    where: { topicId },
    attributes: [['materialId', 'id'], 'title'], // only return id and name
  });
}

async function deleteMaterialBySemester(semester) {
  return Material.destroy({
    where: {
      topicId: {
        [Op.in]: sequelize.literal(`(
          SELECT "topicId" FROM "topic" WHERE semester = ${sequelize.escape(semester)}
        )`)
      }
    }
  });
}


module.exports = {
    createMaterial,
    getAllMaterialsByGroup,
    getMaterialById,
    getMaterialsByTopicId,
    updateMaterial,
    deleteMaterial,
    getMaterialByTopicId,
    deleteMaterialBySemester
};