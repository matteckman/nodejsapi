module.exports = function(router,connection,passport,async,Q){

    router.route('/:model/:id')

        .delete(
            passport.authenticate(
                'token',
                {session: false}
            ),
            function(req,res){

                // SET UP INITIAL QUERY
                var modelName = req.params.model;
                var id = req.params.id;
                var queryString = 'DELETE FROM ' + modelName + ' WHERE id=' + id;

                connection.query(queryString, function(err, rows) {
                    if(err){
                        console.log({query: queryString, err: err, line: 79});
                        next({query: queryString, err: err, line: 79});
                    }else{
                        res.status(200).send(rows);
                    }
                });
            } // end function(req,res)
        ) // end get()

}; // end modules.exports