module.exports = function(router,connection,passport,validModels,async,joins){

/* 
(if JOIN then "fieldName" has to be "tableName.fieldName")
/search/[table]/[table]/[table]/[table]
*/

    router.route('/query/*')

        .post(
            passport.authenticate(
                'token',
                {session: false}
            ),
            function(req,res){
            async.waterfall([

                // GET PARAMS & CHECK FOR PRIVATE DATA
                function(callback){
                    // get params
                    params = req.params[0];
                    userId = req.user.id;

                    // split out table names
                    tableNamesArr = params.split('/');

                    if(tableNamesArr.length == 0){
                        callback('no table name',null);
                    }else{
                        modelName = tableNamesArr[0];
                        tableNamesArr.splice(0,1);
                    } 
                    if(tableNamesArr.length == 0){
                        multiTable = false;
                    }else{
                        multiTable = true;
                        // if there was a trailing slash in the request url, then there will be a blank element in the tableNamesArr which needs to be removed
                        if(tableNamesArr[tableNamesArr.length-1] == ''){
                            tableNamesArr.splice(tableNamesArr.length-1,1);
                        }
                    }

                    // check if table(s) is/are private or public
                    if(validModels[modelName] == 'public'){
                        // if table is public show all records requested
                        userFilter = false;
                    }else if(validModels[modelName] !== null && typeof validModels[modelName] === 'object'){
                        // if first table needs a join to check for valid user data, 
                        // then get record(s) from that table first before joining
                        // other tables
                        
                    }else{
                        // if a table is private to user, filter by user_id
                        userFilter = true;
                    }
                    
                    callback(null,modelName,userFilter,tableNamesArr,multiTable);
                },

                // CHECK FOR FIELD KEY(S)
                /* field: description|contains|hand+pain
                    {
                        name|has,eq,eq,gt,lt|query
                    } */
                function(modelName,userFilter,tableNamesArr,multiTable,callback){
                    // get form fields with: req.body.name ("name" is what the field is
                    // named), loop through every instance of post.field, add to arr
                    fieldList = new Array;
                    fieldName = new Array;
                    request = new Array;
                    constraint = new Array;
                    query = new Array;
                    where = new Array;
                    
                    if(req.body.field != null){
                        // make sure the array of fields is an array or object, if there's only one field it comes through as a string
                        if(typeof req.body.field === 'object'){
                            fieldList = req.body.field;
                        }else{
                            fieldList[0] = req.body.field;
                        }

                        for(i in fieldList){
                            // get field name
                            request = fieldList[i].split('|');
                            if(request[0] == ''){
                                callback('no field name found',null);
                            }else{
                                fieldName[i] = request[0];
                            }

                            // get constraint: has,eq,gt,lt,gteq,lteq
                            if(request[1] == ''){
                                callback('no constraint on field value found',null);
                            }else{
                                constraint[i] = request[1];
                            }

                            // get query value
                            if(request[2] == ''){
                                //callback('no query value found',null);
                                query[i] = '';
                            }else{
                                // remove any extra characters from query string (is url encoded)
                                query[i] = decodeURIComponent(request[2].replace(/\+/g, '%20'));
                            }
                        }

                        for(i in fieldName){
                            // add field name to where statement
                            where[i] = fieldName[i];
                            // add comparison to where statement
                            if(constraint[i] == 'has')
                                where[i] += ' LIKE ';
                            else if(constraint[i] == 'eq')
                                where[i] += '=';
                            else if(constraint[i] == 'gt')
                                where[i] += '>';
                            else if(constraint[i] == 'lt')
                                where[i] += '<';
                            else if(constraint[i] == 'gteq')
                                where[i] += '>=';
                            else if(constraint[i] == 'lteq')
                                where[i] += '<=';
                            else
                                callback('error creating where values',null);
                            // add query value to where statement, wrap with quotes if not a number
                            if(isNaN(query[i]) || query[i] === ''){
                                // wrap with quotes
                                if(constraint[i] == 'has'){
                                    where[i] += '\'%' + query[i] + '%\'';
                                }else{
                                    where[i] += '\'' + query[i] + '\'';
                                }
                            }else{
                                where[i] += query[i];
                            }
                        }

                    }

                    callback(null,modelName,userFilter,tableNamesArr,multiTable,where);
                }, 
                
                // CREATE CORE SQL STATEMENT
                /* SELECT * , COUNT( DISTINCT journal_entry_components.symptom_id ) AS count
                FROM journal_entries
                JOIN journal_entry_components ON ( journal_entries.id = journal_entry_components.journal_entry_id ) 
                JOIN symptoms ON ( symptoms.id = journal_entry_components.symptom_id ) 
                WHERE journal_entries.user_id =5 */
                function(modelName,userFilter,tableNamesArr,multiTable,where,callback){
                    
                    sql = 'SELECT * FROM ' + modelName;

                    // CHECK FOR 'count' KEY
                    /* count: fieldName */
                    if(req.body.count != null){
                        sql += ', COUNT( ';

                        if(req.body.count.indexOf('|') == -1){
                            sql += req.body.count;
                        }else{
                            temp = req.body.orderBy.split('|');
                            sql += 'DISTINCT ' + temp[0] + '';
                        }

                        sql += ' ) AS count';
                    }
                      
                    if(multiTable){
                        for(i in tableNamesArr){
                            if(i == 0){
                                sql += ' JOIN ' + tableNamesArr[i] + ' ON (' + joins[modelName][tableNamesArr[i]] + ')';
                            }else if((tableNamesArr.length-1) <= i){
                                sql += ' JOIN ' + tableNamesArr[i] + ' ON (' + joins[tableNamesArr[i-1]][tableNamesArr[i]] + ')';
                            }
                        }
                    }
                    
                    // add where
                    counter = 0;
                    if(where.length > 0){
                        for(i in where){
                            counter++;
                            if(counter == 1){
                                sql += ' WHERE ' + where[i];
                            }else{
                                sql += ' AND ' + where[i];
                            }
                        }
                    }

                    // if the query is for public data, then this section is not 
                    // needed
                    // need to add a final WHERE to protect private data
                    if(counter == 0){
                        var nextText = ' WHERE ';
                    }else{
                        var nextText = ' AND ';
                    }
                    if(typeof validModels[modelName] === 'object'){
                        sql += nextText + validModels[modelName].join + '.user_id=' + userId;
                    }else if(validModels[modelName] == 'private'){
                        sql += nextText + modelName + '.user_id=' + userId;
                    }

                    callback(null,sql);
                },

                // CHECK FOR 'override_join' KEY
                /* overrideJoin: {
                    tables: '[table]/[table]',
                    fields: 'table.field=table.field'
                } */
                function(sql,callback){
                    /* TO DO
                    if(!req.body.overrideJoin === null){

                    }else{
                        callback(null,sql); // go to next function
                    }*/
                    callback(null,sql);
                },

                // CHECK FOR 'order_by' KEY
                /* orderBy: fieldName|asc,desc */
                function(sql,callback){
                    if(req.body.orderBy != null){
                        if(req.body.orderBy.indexOf('|') == -1){
                            callback('no | found in orderBy field, cannot determine field name and asc vs desc',null);
                        }else{
                            temp = req.body.orderBy.split('|');
                            sql += ' ORDER BY ' + temp[0] + ' ' + temp[1].toUpperCase();
                        }
                    }
                    callback(null,sql); // go to next function
                },

                // CHECK FOR 'group_by' KEY
                /* groupBy: fieldName */
                function(sql,callback){
                    if(req.body.groupBy != null){
                        sql += ' GROUP BY ' + req.body.groupBy;
                    }
                    callback(null,sql); // go to next function
                },

                // CHECK FOR 'limit' KEY
                /* limit: 15 */
                function(sql,callback){
                    if(req.body.limit != null){
                        sql += ' LIMIT ' + req.body.limit;
                    }
                    callback(null,sql); // go to next function
                },

                // DO DATABASE CALL
                function(sqlString,callback){
                    options = {sql: sqlString, nestTables: true};
                    connection.query(options, function(err, rows) {
                        if(err){
                            returnObj = {query: sqlString, dberr: err}
                            callback(returnObj,null);
                        }else{
                            callback(null,rows);
                        }
                    });
                }
            ],

            // SEND TO CLIENT
            function(err,result){
                if(err){
                    console.log(err);
                    res.status(500).send(err);
                }else{
                    res.status(200).send(result);
                }
            }); // end async.waterfall()

            } // end function(req,res)
        ); // end .post()

}; // end modules.exports