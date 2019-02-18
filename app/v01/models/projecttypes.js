
'use strict';
module.exports = (sequelize, DataTypes) => {
  var projecttype = sequelize.define('tblprojecttypes', {
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    typeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
    }
}, {
    timestamps : false
});

  return projecttype;
};

