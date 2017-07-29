/**
*  SymptomCategories schema
*
*  @version     0.0.1
*  @created     2016-04-12T23:46:19.679Z
*  @link        https://camintejs.com/
*  @wiki        https://github.com/biggora/caminte/wiki
*
*  Created by create-model script
**/

/**
*  Define  SymptomCategories Model
*  @param  {Object}  schema
*  @return {Object}  model
*
*  @wiki   https://github.com/biggora/caminte/wiki/Defining-a-Model
**/
module.exports = function(schema){
    var SymptomCategories = schema.define('symptom_categories', {
         parent_id: { type: schema.Number, limit: 11 },
         category: { type: schema.String, limit: 255 },
         category_description: { type: schema.Text },
         disease_id: { type: schema.Number, limit: 11 },
         color_hex: { type: schema.String, limit: 25 },
         created: { type: schema.Date }
    },{


    });

    /**
    *  Define any custom method
    *  or setup validations here
    **/
    SymptomCategories.hasMany(Symptoms,{as: 'symptoms',foreignKey: 'symptom_category_id'});

    return SymptomCategories;
};
