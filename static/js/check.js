window.addEventListener('load', (event) => {
    let notificationSocket = new ReconnectingWebSocket(
        'ws://' + window.location.host +
        '/ws/notification/'
    );

    notificationSocket.onopen = (e) => {
        console.log("notification socket open")
    }
    notificationSocket.onmessage = (e) => {
        alert('message received')
        console.log(e);
    }
    notificationSocket.onclose = (e) => {
        console.log("notification socket close")
    }

    setTimeout(send_data,1000)

    function send_data() {
        notificationSocket.send(
            JSON.stringify({
                'command': 'newMessage',
                'message': "this is my message",
            })
        )
    }
})