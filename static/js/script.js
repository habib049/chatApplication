window.addEventListener('load', (event) => {

    let contacts = document.getElementsByClassName('contact');
    for (let i = 0; i < contacts.length; i++) {
        contacts[i].addEventListener('click', getChat)
    }

    function getChat(e) {
        e.preventDefault();
        $.ajax({
            beforeSend: function (xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            type: 'POST',
            data: {
                'friend_name': this.id.toString().split('-')[1]
            },

            url: '/fectch-messages',
            dataType: 'json',
            success: function (data) {
                // hiding initial screen
                document.getElementsByClassName('initial-screen')[0].style.display = 'none';
                document.getElementsByClassName('chatting-wrapper')[0].style.display = 'block';
                //loading Messages
                loadMessages(data.messages, data.user)
                console.log(data)
            }
        });
    }

    function loadMessages(messages, user) {
        //labeling menu bar
        document.getElementById('chatMenuBarUsername').innerText = messages[0].receiver;
        let chattingArea = document.getElementById('chattingArea');

        //loading messages
        for (let i = 0; i < messages.length; i++) {
            let messageDiv = document.createElement('div');
            if (user.toString() === messages[i].sender) { //sender message
                messageDiv.classList.add('outgoing-message');
                messageDiv.innerHTML = `<div class="sent-message-content">
                                                <p>${messages[i].content}</p>
                                                <span class="time-date">${messages[i].timestamp}</span>
                                         </div>`

            } else {//receiver message
                messageDiv.classList.add('incoming-message');
                messageDiv.innerHTML = `<div class="received-message">
                                              <div class="received-message-content">
                                                <p>${messages[i].content}</p>
                                                <span class="time-date">${messages[i].timestamp}</span>
                                              </div>
                                         </div>`
            }

            // attaching message to amin div
            chattingArea.append(messageDiv);
        }
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            let cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                let cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }


    document.getElementById('messageInputForm').addEventListener('submit', (e) => {
        e.preventDefault();

        let outgoingMessageDiv = document.createElement('div');
        outgoingMessageDiv.classList.add('outgoing-message');

        outgoingMessageDiv.innerHTML = "<div class=\"sent-message-content\">\n" +
            "                                        <p>Test which is a new approach to have all\n" +
            "                                            solutions</p>\n" +
            "                                        <span class=\"time-date\"> 11:01 AM    |    June 9</span>\n" +
            "                                    </div>";

        document.getElementById('chattingArea').append(outgoingMessageDiv);
    })

});