const Controller = require('../models/Controller');
const User = require('../models/User');

/**
 * 새 회원을 관제사에게 자동 배정
 * 가장 적은 회원을 관리하는 관제사에게 배정
 */
async function assignUserToController(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  // 이미 배정되어 있으면 스킵
  if (user.assignedController) {
    return {
      assigned: false,
      reason: 'already_assigned',
      controllerId: user.assignedController
    };
  }

  // 온라인 상태이고 여유가 있는 관제사 찾기
  const controllers = await Controller.find({
    status: 'online',
    $expr: { $lt: [{ $size: '$assignedUsers' }, '$maxUsers'] }
  })
    .sort({ 'assignedUsers': 1 }) // 가장 적은 회원을 관리하는 순서
    .limit(1);

  if (controllers.length === 0) {
    // 온라인 관제사가 없으면 오프라인이라도 배정
    const offlineControllers = await Controller.find({
      $expr: { $lt: [{ $size: '$assignedUsers' }, '$maxUsers'] }
    })
      .sort({ 'assignedUsers': 1 })
      .limit(1);

    if (offlineControllers.length === 0) {
      return {
        assigned: false,
        reason: 'no_available_controller'
      };
    }

    const controller = offlineControllers[0];
    user.assignedController = controller._id;
    await user.save();

    await Controller.findByIdAndUpdate(controller._id, {
      $push: { assignedUsers: userId }
    });

    return {
      assigned: true,
      controllerId: controller._id,
      controllerName: controller.name
    };
  }

  const controller = controllers[0];
  user.assignedController = controller._id;
  await user.save();

  await Controller.findByIdAndUpdate(controller._id, {
    $push: { assignedUsers: userId }
  });

  return {
    assigned: true,
    controllerId: controller._id,
    controllerName: controller.name
  };
}

/**
 * 관제사 배정 해제
 */
async function unassignUserFromController(userId) {
  const user = await User.findById(userId);
  if (!user || !user.assignedController) {
    return { unassigned: false, reason: 'not_assigned' };
  }

  const controllerId = user.assignedController;
  user.assignedController = null;
  await user.save();

  await Controller.findByIdAndUpdate(controllerId, {
    $pull: { assignedUsers: userId }
  });

  return {
    unassigned: true,
    controllerId
  };
}

module.exports = {
  assignUserToController,
  unassignUserFromController
};
