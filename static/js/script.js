window.addEventListener('load', (event) => {

    let chattingArea = document.getElementById('chattingArea');
    let userLastMessage = "";

    let user = document.getElementsByClassName('user-image')[0].id;
    let friend = "";

    // getting first user and make connection on it
    let firstFriend = document.getElementsByClassName('contact-username')[0].innerHTML;


    // this socket is for notifications like someone else message you
    // or someone is online or not

    let notificationSocket = new ReconnectingWebSocket(
        'ws://' + window.location.host +
        '/ws/notification/'
    );

    notificationSocket.onopen = (e) => {
        console.log("notification socket open")
    }
    notificationSocket.onmessage = (e) => {
        let data = JSON.parse(e.data);
        if (data.message_type === "typing") {
            //calling the message
            userTyping(data.message, data.friend, data.user);
        } else if (data.message_type === "stop_typing") {
            stopTyping(data.message, data.friend, data.user);
        }
    }
    notificationSocket.onclose = (e) => {
        console.log("notification socket close")
    }


    //making websocket connection
    let chatSocket = new ReconnectingWebSocket(
        'ws://' + window.location.host +
        '/ws/chat/' + firstFriend + '/'
    );

    chatSocket.onopen = (e) => {
        console.log('connection open');
    };
    chatSocket.onmessage = (e) => {
        let data = JSON.parse(e.data)

        if (data.message_type) {
            if (data.message_type === 'delete_message')
                deleteMessage(data.message_id, data.message);
            else if (data.message_type === 'typing') {
                if (data.user !== user)
                    userTyping(data.message, data.friend)
            } else if (data.message_type === 'stop_typing') {
                if (data.user !== user)
                    stopTyping(data.message, data.friend);
            }
        } else {
            loadNewMessage(data.content, data.timestamp, data.sender, data.receiver);
        }

    };
    chatSocket.onclose = (e) => {
        console.log('connection close');
    };


    function changeUrl(friendName) {
        chatSocket.url = 'ws://' + window.location.host +
            '/ws/chat/' + friendName + '/';
        chatSocket.refresh();
    }


    let contacts = document.getElementsByClassName('contact');
    for (let i = 0; i < contacts.length; i++) {
        contacts[i].addEventListener('click', getChat)
    }

    function getChat(e) {
        e.preventDefault();
        let friendName = this.id.toString().split('-')[1];
        if (friend !== friendName) {
            $.ajax({
                beforeSend: function (xhr, settings) {
                    if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                    }
                },
                type: 'POST',
                data: {
                    'friend_name': friendName
                },

                url: '/fectch-messages',
                dataType: 'json',
                success: function (data) {

                    console.log(data);

                    // hiding initial screen
                    document.getElementsByClassName('initial-screen')[0].style.display = 'none';
                    document.getElementsByClassName('chatting-wrapper')[0].style.display = 'block';
                    //loading Messages
                    loadMessages(data.messages, data.user, friendName);
                    changeUrl(friendName);
                    friend = friendName;
                    addListenersToDeleteAndReplyButtons();
                }
            });
        }
    }

    function loadMessages(messages, user, friendName) {
        //labeling menu bar
        document.getElementById('chatMenuBarUsername').innerText = friendName;

        chattingArea.innerHTML = "";//clear the previous content

        //loading messages
        for (let i = 0; i < messages.length; i++) {
            let messageDiv = document.createElement('div');
            let date = new Date(messages[i].timestamp);
            let messageDate = getMessageDateTime(date);

            if (user.toString() === messages[i].sender) { //sender message
                messageDiv.classList.add('outgoing-message');
                messageDiv.id = "message" + messages[i].id;

                console.log(messages[i].deleted)
                if (messages[i].deleted) {
                    messageDiv.innerHTML = `<div class="sent-message-content message-content">
                                                <p id="message-content-${messages[i].id}" class="sent-content" style="background-color:#49495a;">
                                                    ${messages[i].content}
                                                </p>
                                                <span class="time-date"></span>
                                         </div>`

                } else {
                    console.log("simple messages")
                    messageDiv.innerHTML = `<div class="sent-message-content message-content">
                                                <p id="message-content-${messages[i].id}" class="sent-content">
                                                    ${messages[i].content}
                                                    <span class="message-options">
                                                       <i id="reply-message-${messages[i].id}" class="fas fa-reply message-reply"></i>
                                                        <i id="delete-message-${messages[i].id}" class="fas fa-trash-alt delete-message"></i>
                                                    </span> 
                                                    </p>
                                                <span class="time-date">${messageDate}</span>
                                         </div>`
                }


            } else {//receiver message
                messageDiv.classList.add('incoming-message');
                if (messages[i].deleted) {
                    messageDiv.innerHTML = `<div class="received-message">
                                              <div class="received-message-content message-content ">
                                                <p id="message-content-${messages[i].id}" class="received-content" style="background-color:#49495a;">
                                                    ${messages[i].content}                                                   
                                                </p>
                                                <span class="time-date"></span>                                                
                                              </div>`
                } else {
                    messageDiv.innerHTML = `<div class="received-message">
                                              <div class="received-message-content message-content">
                                                <p id="message-content-${messages[i].id}" class="received-content">
                                                    ${messages[i].content}
                                                     <span class="message-options">
                                                       <i id="reply-message-${messages[i].id}" class="fas fa-reply message-reply"></i>
                                                    </span>                                                    
                                                </p>
                                                <span class="time-date">${messageDate}</span>                                                
                                              </div>`
                }

            }

            // attaching message to amin div
            chattingArea.append(messageDiv);
        }

        if (chattingArea.scrollHeight > chattingArea.clientHeight) {
            chattingArea.scrollTop = chattingArea.scrollHeight;
        }
    }

    function addListenersToDeleteAndReplyButtons() {
        let messageReplies = document.getElementsByClassName('message-reply');
        let deleteMessage = document.getElementsByClassName('delete-message');
        for (let i = 0; i < messageReplies.length; i++) {
            messageReplies[i].addEventListener('click', replyMessageHandler);
            deleteMessage[i].addEventListener('click', deleteMessageHandler);
        }
    }


    let replyMessageSection = document.getElementById('replyMessageSection');

    function replyMessageHandler() {

        replyMessageSection.classList.remove('sender-reply-message');
        replyMessageSection.classList.remove('receiver-reply-message');

        let splitId = this.id.toString().split('-');
        let contentId = "message-content-" + splitId[2]
        let replyMessage = document.getElementById(contentId);
        document.getElementById('replyMessageContent').innerText = replyMessage.innerText;

        if (replyMessage.classList.contains('sent-content')) {
            replyMessageSection.classList.add('sender-reply-message')
        } else {
            replyMessageSection.classList.add('receiver-reply-message')
        }
        document.getElementById('replySectionWrapper').style.display = 'block';
        chattingArea.style.height = '510px';
        chattingArea.style.marginBottom = '52px';

        if (chattingArea.scrollHeight > chattingArea.clientHeight) {
            chattingArea.scrollTop = chattingArea.scrollHeight;
        }


    }

    document.getElementById('closeReplyButton').addEventListener('click', (e) => {
        document.getElementById('replySectionWrapper').style.display = 'none';
        replyMessageSection.classList.remove('sender-reply-message');
        replyMessageSection.classList.remove('receiver-reply-message');

        chattingArea.style.height = '568px';
        chattingArea.style.marginBottom = '0';

        if (chattingArea.scrollHeight > chattingArea.clientHeight) {
            chattingArea.scrollTop = chattingArea.scrollHeight;
        }

    })

    function deleteMessageHandler() {
        let messageId = this.id.toString().split('-')[2];

        chatSocket.send(
            JSON.stringify({
                'command': 'deleteMessage',
                'message': messageId
            })
        )
    }

    function deleteMessage(messageId, message) {
        let messageContent = document.getElementById('message-content-' + messageId);
        messageContent.innerText = message;
        messageContent.style.backgroundColor = "#49495a";
        //removing the timestamp
        messageContent.parentNode.lastElementChild.innerHTML = "";
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

    let timer, timeoutVal = 1000;

    let messageInput = document.getElementById('messageInput');

    // typing event
    messageInput.addEventListener('keypress', (e) => {
        window.clearTimeout(timer);
        notificationSocket.send(
            JSON.stringify({
                'command': 'typing',
                'user': user,
                'friend': friend,
                'message': 'typing'
            })
        )
    })

    messageInput.addEventListener('keyup', (e) => {
        window.clearTimeout(timer); // prevent errant multiple timeouts from being generated
        timer = window.setTimeout(() => {
            notificationSocket.send(
                JSON.stringify({
                    'command': 'stop_typing',
                    'user': user,
                    'friend': friend,
                    'message': ''
                })
            );
        }, timeoutVal);

    })

    //user typing
    function userTyping(message, messageFriend, messageUser) {
        if (friend === messageUser) { // display in live user label
            document.getElementById('user-status').innerText = message;
        } else { // display in contacts that someone is typing
            //getting the user contact element
            let userContactId = "information-" + messageUser;

            let userContact = document.getElementById(userContactId)
            userContact.classList.add('typing-information')

            //saving the user last message
            if (userContact.innerText !== "typing..") {
                userLastMessage = userContact.innerText;
            }
            userContact.innerText = "typing.."
        }
    }

    //stop typing
    function stopTyping(message, messageFriend, messageUser) {
        if (friend === messageUser) { // display in live user label
            document.getElementById('user-status').innerText = message;
        } else { // display in contacts that someone is typing
            //getting the user contact element
            let userContactId = "information-" + messageUser;
            let userContact = document.getElementById(userContactId)
            userContact.classList.remove('typing-information')
            userContact.innerText = userLastMessage;
        }
    }


    document.getElementById('messageInputForm').addEventListener('submit', (e) => {
        e.preventDefault();

        //sending the message
        let message = messageInput.value;
        messageInput.value = "";

        chatSocket.send(
            JSON.stringify({
                'command': 'newMessage',
                'sender': user,
                'receiver': friend,
                'message': message
            })
        )
    })


    function loadNewMessage(message, timestamp, sender, receiver) {

        if (user === sender) {
            let outgoingMessageDiv = document.createElement('div');
            outgoingMessageDiv.classList.add('outgoing-message');

            outgoingMessageDiv.innerHTML = `<div class="sent-message-content">
                                                <p>${message}</p> 
                                                <span class="time-date">${getMessageDateTime(timestamp)}</span>
                                            </div>`

            chattingArea.append(outgoingMessageDiv);
        } else if (friend === receiver) {
            let incomingMessageDiv = document.createElement('div');
            incomingMessageDiv.classList.add('incoming-message');

            incomingMessageDiv.innerHTML = `<div class="received-message">
                                                <div class="received-message-content">
                                                    <p>${message}</p> 
                                                    <span class="time-date">11:01 AM | June 9</span>
                                                </div>
                                            </div>`
            chattingArea.append(incomingMessageDiv);
        }
        if (chattingArea.scrollHeight > chattingArea.clientHeight) {
            chattingArea.scrollTop = chattingArea.scrollHeight;
        }
    }

    function getMessageDateTime(timestamp) {
        let date = new Date(timestamp);
        let messageDate = date.getDate() + "-"
            + date.toLocaleDateString('en-us', {month: 'short'}) + "-"
            + date.getFullYear()
            + " | "
            + date.getHours()
            + ":" + date.getMinutes();
        return messageDate;
    }
});