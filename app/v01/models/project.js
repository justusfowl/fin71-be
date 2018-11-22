
'use strict';
module.exports = (sequelize, DataTypes) => {
  var project = sequelize.define('tblprojects', {
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    projectTitle: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    projectCreatedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    projectIconPath: {
        type: DataTypes.TEXT,
        allowNull: true
    },
}, {
    timestamps : false
});

  return project;
};

