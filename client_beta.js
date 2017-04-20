var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({ extended: false, limit: '200mb', parameterLimit: 50000 }));
app.use(express.static('frontend_beta')); //needed for css
var request = require('request');
var markdown = require('markdown').markdown;
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var http = require('http');
var https = require('https');
var shortid = require('shortid');


var server_ip = "";
var editor_info = {
    name: "",
    id: shortid.generate(), //TODO: auto generate
    type: "user"
}

var local_user;

var current_user;
var current_module;

//options to be used for all tests
//request reference: http://samwize.com/2013/08/31/simple-http-get-slash-post-request-in-node-dot-js/
var serverRequestOptions = {
    host: 'localhost',
    port: '8081',
    path: '/',
    method: 'GET',
    use_https: false
};

//live chat functionaliy initially based off of Socket IO tutorial
//https://socket.io/get-started/chat/
io.on('connection', function (socket) {
    console.log(socket.conn.remoteAddress + ' connected');
    io.emit('ip', server_ip);
    socket.on('header update', function(header){
        console.log("received " + header);
        io.emit('header update', header);
    })

    socket.on('disconnect', function () {
        console.log(socket.conn.remoteAddress + ' disconnected');
    });

    socket.on('login request', function (name, ip, use_https) {
        console.log("Received " + name + " and " + ip);
        editor_info["name"] = name;
        server_ip = ip;
        serverRequestOptions["host"] = ip.split(':')[0];
        serverRequestOptions["port"] = ip.split(':')[1];
        if (serverRequestOptions["port"] == "") {
            delete serverRequestOptions["port"];
        }
        serverRequestOptions["use_https"] = use_https;

        local_user = {
            name: editor_info["name"],
            id: editor_info["id"],
            type: "guardian",
            logs: [],
            notifications: [],
            isBeingListened: false,
            last_update_time: "1970-01-01 00:00:00"
        };
        send_data_get_response('/user/add', 'POST', JSON.stringify(local_user), function (fullResponse) {
            var server_response = JSON.parse(fullResponse);
            console.log(server_response);
            if(server_response.message.code != undefined){ //error occurred
                server_ip = "";
            }else{
                io.emit('ip', server_ip);
            }   

            io.emit('login response', JSON.stringify(server_response));
            // send_response_to_client(server_response);
            // res.redirect('/index');
        });
    });

    socket.on('notifications request',function(){
        // console.log("Received notif request");
        var request_data = JSON.stringify(local_user);
        send_data_get_response('/notifications', 'POST', request_data, function(fullResponse){
            io.emit('notifications response', fullResponse);
        });
    });

    socket.on('user list request',function(){
          get_server_response('/user/list','GET',function(fullResponse){
              io.emit('user list response', fullResponse);
          })
    });

    socket.on('save user', function(user_str){
        current_user = JSON.parse(user_str);
    });

    socket.on('user request', function () {
        io.emit('user response', JSON.stringify(current_user));
    });

    socket.on('module request', function (id) {
        console.log("Received " + id);
        var path = '/module/id/' + id;
        get_server_response(path, 'GET', function (fullResponse) {
            try {
                var result = JSON.parse(fullResponse);
                io.emit('module found', JSON.stringify(result));
                console.log("Emitted " + JSON.stringify(result));
            } catch (err) {
                console.log(err);
            }
        });
    });

});

function send_response_to_client(response_obj) {
    // var msg = (response_obj["success"] ? "SUCCESS: " : "FAILURE: ") + response_obj["message"];
    // console.log("Sending " + msg);
    io.emit('response', JSON.stringify(response_obj));
}


//get a response from the server (for GET methods)
function get_server_response(path, method, callbackFn) {
    delete serverRequestOptions["headers"];
    delete serverRequestOptions["form"];
    serverRequestOptions.path = path;
    serverRequestOptions.method = method;
    var fullResponse = "";
    var serverRequest;

    //read data
    if (serverRequestOptions.use_https) {
        serverRequest = https.get(serverRequestOptions, function (serverResponse) {
            serverResponse.on('data', function (data) {
                fullResponse += data;
            });

            // finished reading all data
            serverResponse.on('end', function () {
                callbackFn(fullResponse);
            });

            serverResponse.on('error', function (error) {
                callbackFn(JSON.stringify(error));
            });
        });
    } else {
        serverRequest = http.get(serverRequestOptions, function (serverResponse) {
            serverResponse.on('data', function (data) {
                fullResponse += data;
            });

            // finished reading all data
            serverResponse.on('end', function () {
                callbackFn(fullResponse);
            });

            serverResponse.on('error', function (error) {
                callbackFn(JSON.stringify(error));
            });
        });
    }

    serverRequest.on('error', function (error) {
        console.log(error.stack);
        fullResponse = JSON.stringify(error);
        callbackFn(fullResponse);
    });

    serverRequest.on('end', function () {
        callbackFn(fullResponse);
    });

    serverRequest.end();
};

//helper function to handle responses from the server
function handle_request_response(err, httpResponse, body, callbackFn) {
    var response_obj = {
        success: false,
        message: ""
    }

    if (err) {
        console.log(err);
        response_obj["message"] = err;
        callbackFn(JSON.stringify(response_obj));
    }
    try {
        var json_body = JSON.parse(body);
        callbackFn(JSON.stringify(json_body))
    } catch (err) {
        console.log(err);
        response_obj["message"] = err;
        callbackFn(JSON.stringify(response_obj));
    }
}

//handle sending data to the server (for POST and DELETE protocols)
function send_data_get_response(path, method, dataToSend, callbackFn) {
    serverRequestOptions["headers"] = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    serverRequestOptions["form"] = { data: dataToSend };
    serverRequestOptions.path = path;
    serverRequestOptions.method = method;
    var fullResponse = "";
    var my_obj = JSON.parse(dataToSend);


    var url = (serverRequestOptions.use_https ? "https://" : "http://") + serverRequestOptions.host +
        ':' + serverRequestOptions.port + path;
    if (method.toLowerCase() == 'post') {
        request.post({ headers: serverRequestOptions["headers"], url: url, form: serverRequestOptions["form"] }, function (err, httpResponse, body) {
            handle_request_response(err, httpResponse, body, callbackFn);
        });
    } else if (method.toLowerCase() == 'delete') {
        request.delete({ headers: serverRequestOptions["headers"], url: url, form: serverRequestOptions["form"] }, function (err, httpResponse, body) {
            handle_request_response(err, httpResponse, body, callbackFn);
        });
    } else {
        response_obj["success"] = false;
        response_obj["message"] = "Error: " + method + " is not a valid method";
        callbackFn(JSON.stringify(response_obj));
    }
}

//convert a date object to the following format
//yyyy-mm-dd hh:mm:ss
function get_formatted_date(date) {
    function get_formatted_num(num, expected_length) {
        var str = "";
        var num_str = num.toString();
        var num_zeros = expected_length - num_str.length;
        for (var i = 0; i < num_zeros; ++i) {
            str += '0';
        }
        str += num_str;
        return str;
    }
    var msg = get_formatted_num(date.getFullYear(), 4) + "-";
    msg += get_formatted_num(date.getMonth() + 1, 2) + "-";
    msg += get_formatted_num(date.getDate(), 2) + " ";
    msg += get_formatted_num(date.getHours(), 2) + ":";
    msg += get_formatted_num(date.getMinutes(), 2) + ":";
    msg += get_formatted_num(date.getSeconds(), 2);
    return msg;
}

app.get('/',function(req,res){
    res.sendFile(__dirname + "/frontend_beta/" + "wrapper.html");
});

app.get('/index',function(req,res){
    console.log("Received request for /index");
    console.log(server_ip);
    if(server_ip == "")
        res.sendFile(__dirname + "/frontend_beta/" + "splash.html");
    else
        res.sendFile(__dirname + "/frontend_beta/" + "system_overview.html");
});

app.get('/user',function(req,res){
    res.sendFile(__dirname + "/frontend_beta/" + "user_overview.html");
});

app.get('/user/add',function(req,res){
    res.sendFile(__dirname + "/frontend_beta/" + "user_add.html");
});

app.get('/user/add/options', function (req, res) {
    // console.log(req);
    var newUser = {
        name: req.query.name,
        id: shortid.generate(),
        type: req.query.type,
        logs: [],
        notifications: [],
        isBeingListened: false,
        last_update_time: get_formatted_date(new Date())
    };
    console.log(newUser);
    var path = '/user/add';
    send_data_get_response(path, 'POST', JSON.stringify(newUser), function (fullResponse) {
        var server_response = JSON.parse(fullResponse);
        console.log(server_response);

        send_response_to_client(server_response);
        // res.end();
        if(server_response.success)
            res.redirect('/user');
        else
            res.end();
    });
});


server.listen(4000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("Test client listening at http://%s:%s", host, port);
});
