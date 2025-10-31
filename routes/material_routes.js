const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth_middleware');
const materialControllers = require('../controllers/material_controller');
const materialMiddleWare = require('../middleware/material_middleware');
const {canSeeTopic, findTopicById} = require('../middleware/topic_middleware');

router.route('/createMaterial')
    .post(auth.adminProtect, materialMiddleWare.checkInputData,
         materialMiddleWare.checkTopicExists, materialControllers.createMaterial);

router.route('/getAllMaterials')
    .get(auth.protect, materialControllers.getAllMaterials);

router.route('/get_material_by_id/:id')
    .get(auth.protect, materialMiddleWare.findMaterialById,
         materialMiddleWare.canSeeMaterial, materialControllers.getMaterialById);

router.route('/getMaterialByTopicId/:topicId')
    .get(auth.protect, findTopicById, canSeeTopic,
         materialControllers.getMaterialByTopicId);

router.route('/updateMaterial/:id')
    .patch(auth.adminProtect, materialMiddleWare.findMaterialById,
           materialMiddleWare.AdminViewMaterial,
           materialMiddleWare.checkInputData,
           materialControllers.updateMaterial);

router.route('/deleteMaterial/:id')
    .delete(auth.adminProtect, materialMiddleWare.findMaterialById,
            materialMiddleWare.AdminViewMaterial,
            materialControllers.deleteMaterial);

module.exports = router;