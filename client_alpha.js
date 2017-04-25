var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var markdown = require('markdown').markdown;
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var http = require('http');
var https = require('https');

app.use(bodyParser.urlencoded({ extended: false, limit: '200mb', parameterLimit: 50000 }));

var server_ip = "";
var editor_info = {
    name: "",
    id: "DEMO_USER",
    type: "user"
}

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
    console.log('A user connected');
    io.emit('ip', server_ip);

    socket.on('disconnect', function () {
        console.log('A user disconnected');
    });

    socket.on('info update', function (name, ip, use_https) {
        console.log("Received " + name + " and " + ip);
        editor_info["name"] = name,
        server_ip = ip;
        serverRequestOptions["host"] = ip.split(':')[0];
        serverRequestOptions["port"] = ip.split(':')[1];
        if (serverRequestOptions["port"] == ""){
            delete serverRequestOptions["port"];
        }
        serverRequestOptions["use_https"] = use_https;

        var clientUser = {
            name: editor_info["name"],
            id: editor_info["id"],
            type: "guardian",
            logs: [],
            notifications: [],
            isBeingListened: false,
            last_update_time: get_formatted_date(new Date())
        };
        send_data_get_response('/user/add', 'POST', JSON.stringify(clientUser), function (fullResponse) {
            var server_response = JSON.parse(fullResponse);
            console.log(server_response);

            send_response_to_client(server_response);
            // res.redirect('/index');
        });
    });

    socket.on('user request', function(id){
        console.log("Received " + id);
        var path = '/user/id/' + id;
        get_server_response(path,'GET',function(fullResponse){
            try{
                var result = JSON.parse(fullResponse);
                io.emit('user found', JSON.stringify(result));
                console.log("Emitted " + JSON.stringify(result));
            }catch(err){
                console.log(err);
            }
        })
    })

    socket.on('module request', function (id) {
        console.log("Received " + id);
        var path = '/module/id/' + id;
        get_server_response(path, 'GET', function (fullResponse) {
            try{
                var result = JSON.parse(fullResponse);
                io.emit('module found', JSON.stringify(result));
                console.log("Emitted " + JSON.stringify(result));
            }catch(err){
                console.log(err);
            }
        })
    })
});

function send_response_to_client(response_obj){
    var msg = (response_obj["success"] ? "SUCCESS: " : "FAILURE: ") + response_obj["message"];
    io.emit('response',msg);
}

function load_page(mdFileName){
    var prefix = "<!DOCTYPE html> \
        <html>\
        <head>\
            <title>MMSS Demo</title>\
        </head>\
        <body>";
    var suffix = "</body>\
        </html>" 
    try{
        var md = fs.readFileSync(__dirname + "/frontend_alpha/" + mdFileName,'utf8');
        return prefix + markdown.toHTML(md) + suffix;
    }catch(err){
        console.log(err);
        return "Error loading " + mdFileName.split('.')[0];
    }
};


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

app.get('/', function(req,res){
    if(server_ip != undefined && server_ip.length > 0){
        res.sendFile(__dirname + "/frontend_alpha/" + "main.html");
    }else
        res.sendFile(__dirname + "/frontend_alpha/" + "get_server.html");
});

app.get('/index',function(req,res){
    res.end(load_page("index.md"));
});

app.get('/user/add',function(req,res){
    res.sendFile(__dirname + "/frontend_alpha/" + "user_add.html");
});

app.get('/user/edit', function (req, res) {
    res.sendFile(__dirname + "/frontend_alpha/" + "user_edit.html");
});

app.get('/user/edit/options', function (req, res) {
    console.log(req);
    var editedUser = {
        editor_info: editor_info,
        name: req.query.name,
        id: req.query.id_user,
        type: req.query.type,
        logs: [],
        notifications: [],
        isBeingListened: (req.query.isWhitelisted == 'true') ? true : false,
        last_update_time: get_formatted_date(new Date())
    };
    console.log(editedUser);
    var path = '/user/edit';
    send_data_get_response(path, 'POST', JSON.stringify(editedUser), function (fullResponse) {
        var server_response = JSON.parse(fullResponse);
        console.log(server_response);

        send_response_to_client(server_response);
        res.redirect('/index');
    });
});

app.get('/user/add/options',function(req,res){
    // console.log(req);
    var newUser = {
        name: req.query.name,
        id: req.query.id,
        type: req.query.type,
        logs: [],
        notifications: [],
        isBeingListened: false,
        last_update_time: get_formatted_date(new Date())
    };
    console.log(newUser);
    var path = '/user/add';
    send_data_get_response(path,'POST',JSON.stringify(newUser),function(fullResponse){
        var server_response = JSON.parse(fullResponse);
        console.log(server_response);

        send_response_to_client(server_response);
        res.redirect('/index');
    });
});

app.get('/user/list', function(req,res){
    var path = '/user/list';
    get_server_response(path,'GET',function(fullResponse){
        var server_response = JSON.parse(fullResponse);
        var md_msg = "";
        for(u in server_response){
            var curUser = server_response[u];
            md_msg += "* " + curUser["name"] + " (" + curUser["id"] + ") | Type: " + curUser["type"];
            md_msg += " | " + (curUser["isBeingListened"] ? "whitelist" : "blacklist") + "\n";
        }
        res.send(markdown.toHTML(md_msg));
    })
});

app.get('/module/edit', function (req, res) {
    res.sendFile(__dirname + "/frontend_alpha/" + "module_edit.html");
});

app.get('/module/edit/options', function (req, res) {
    // console.log(req);
    var parameterData;
    try{
        parameterData = JSON.parse(req.query.parameterData);
    }catch(err){
        console.log(err);
        parameterData = [];
    }
    var editedModule = {
        editor_info: editor_info,
        name: req.query.name,
        id: req.query.id_user,
        type: req.query.type,
        parameterData: parameterData,
        isBeingListened: (req.query.isWhitelisted == 'true') ? true : false,
        last_update_time: get_formatted_date(new Date())
    };
    console.log(editedModule);
    var path = '/module/edit';
    send_data_get_response(path, 'POST', JSON.stringify(editedModule), function (fullResponse) {
        var server_response = JSON.parse(fullResponse);
        console.log(server_response);

        send_response_to_client(server_response);
        res.redirect('/index');
    });
});

app.get('/module/add', function (req, res) {
    res.sendFile(__dirname + "/frontend_alpha/" + "module_add.html");
});

app.get('/module/add/options', function (req, res) {
    // console.log(req);
    var newModule = {
        name: req.query.name,
        id: req.query.id,
        type: req.query.type,
        mainServerID: server_ip,
        parameterData: ["param 1"],
        isBeingListened: false,
    };
    console.log(newModule);
    var path = '/module/add';
    send_data_get_response(path, 'POST', JSON.stringify(newModule), function (fullResponse) {
        var server_response = JSON.parse(fullResponse);
        console.log(server_response);

        send_response_to_client(server_response);
        res.redirect('/index');
    });
});

app.get('/module/list', function (req, res) {
    var path = '/module/list';
    get_server_response(path, 'GET', function (fullResponse) {
        var server_response = JSON.parse(fullResponse);
        var md_msg = "";
        for (u in server_response) {
            var curModule = server_response[u];
            md_msg += "* " + curModule["name"] + " (" + curModule["id"] + ") | Type: " + curModule["type"] + "\n";
        }
        res.send(markdown.toHTML(md_msg));
    });
});

server.listen(4000, function(){
    var host = server.address().address;
    var port = server.address().port;

    console.log("Test client listening at http://%s:%s", host, port);
});