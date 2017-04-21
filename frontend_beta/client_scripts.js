var socket = undefined;

function emitHeader(header) {
    console.log("sending " + header);
    socket.emit('header update', header);
}

function emitBackButton(url_path){
    socket.emit("back button update", url_path);
}

function gotoPage(url){
    window.location.replace(url);
}
