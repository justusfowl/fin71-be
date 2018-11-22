
'use strict';
module.exports = (sequelize, DataTypes) => {
  var type = sequelize.define('tbltypes', {
    typeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true, 
        autoIncrement: true
    },

    typeTitle: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    typeIcon: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
}, {
    timestamps : false
});

  return type;
};

