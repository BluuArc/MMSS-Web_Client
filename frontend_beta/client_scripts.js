var socket = undefined;

function emitHeader(header) {
    console.log("sending " + header);
    socket.emit('header update', header);
}
