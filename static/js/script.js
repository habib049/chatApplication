window.addEventListener('load', (event) => {

    let chattingArea = document.getElementById('chattingArea');
    let userLastMessage = "";
    let total_pages = "";

    let user = document.getElementsByClassName('user-image')[0].id;
    let friend = "";

    // getting first user and make connection on it
    let firstFriend = document.getElementsByClassName('contact-username')[0].innerHTML;

    //opening the first user chat
    getChat(firstFriend);

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
        } else if (data.message_type === "message_notification") {
            notifyNewMessage(data.content, data.sender, data.timestamp)
        }

    }

    notificationSocket.onclose = (e) => {
        console.log("notification socket close")
    }
    //
    // setTimeout(() => {
    //     notifyNewMessage('this is new message for checking', 'raheel', "")
    // }, 2000)

    function notifyNewMessage(message, sender, timestamp) {
        let contactId = "conversion-" + sender;
        let newMessageId = "information-" + sender;

        let contact = document.getElementById(contactId);
        let lastMessage = document.getElementById(newMessageId);
        //getting last message time p tag
        let lastMessageTime = contact.getElementsByClassName('last-message-time-p')[0]
        // getting the contacts section to make the new message contact first child
        let contactsSection = document.getElementsByClassName('contact-section')[0];

        // setting data
        lastMessage.innerText = message;
        lastMessageTime.innerText = getLastMessageTime(timestamp);

        // contact.style.backgroundColor = "#1d1d1d";
        // lastMessage.style.color = "orange";
        // lastMessageTime.style.color = "orange";

        //making the contact first
        contactsSection.removeChild(contact);
        contactsSection.prepend(contact);
        contact.classList.add("new-message-contact")
    }

    // function make last message time string
    function getLastMessageTime(timestamp) {
        let date = new Date(timestamp);
        return date.getHours() + ":" + date.getMinutes();
    }

    //making websocket connection with chat socket
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
            } else if (data.message_type === 'message_notification') {
                loadNewMessage(data.content, data.timestamp, data.sender, data.receiver);
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
        contacts[i].addEventListener('click', getChatWrapper)
    }

    function getChatWrapper(e) {
        let friendName = this.id.toString().split('-')[1];
        getChat(friendName);
    }

    function getChat(friendName) {
        if (friend !== friendName) {
            $.ajax({
                beforeSend: function (xhr, settings) {
                    if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                    }
                },
                type: 'POST',
                data: {
                    'friend_name': friendName,
                },

                url: '/fectch-messages',
                dataType: 'json',
                success: function (data) {

                    // this is for pagination
                    total_pages = data.page_data.last_page;


                    //changing color of contact
                    // if there is nay new message it removes the styling of new message
                    let contact = document.getElementById('conversion-' + friendName);

                    if (contact.classList.contains('new-message-contact')) {
                        contact.classList.remove('new-message-contact');
                    }

                    //loading Messages
                    loadMessages(data.messages, data.user, friendName);
                    console.log(data.messages.length)

                    if (data.messages.length < 10) {
                        total_pages -= 1;
                        getMoreChat(friendName, total_pages)
                    }

                    if (friendName !== firstFriend) //first friend is already connected
                        changeUrl(friendName);

                    friend = friendName;
                    addListenersToDeleteButtons();
                }
            });
        }
        return false; //to prevent the any kind of loading
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
                if (messages[i].deleted) {
                    messageDiv.innerHTML = `<div class="sent-message-content message-content">
                                                <p id="message-content-${messages[i].id}" class="sent-content" style="background-color:#49495a;">
                                                    ${messages[i].content}
                                                </p>
                                                <span class="time-date"></span>
                                         </div>`

                } else {
                    messageDiv.innerHTML = `<div class="sent-message-content message-content">
                                                <p id="message-content-${messages[i].id}" class="sent-content">
                                                    ${messages[i].content}
                                                    <span class="message-options">                                                      
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

    function addListenersToDeleteButtons() {
        let deleteMessage = document.getElementsByClassName('delete-message');
        for (let i = 0; i < deleteMessage.length; i++) {
            deleteMessage[i].addEventListener('click', deleteMessageHandler);
        }
    }

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
        } else if (user === receiver) {
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


    //load more messages in infinite manner
    chattingArea.addEventListener('scroll', (e) => {
        let position = chattingArea.scrollTop;
        if (position === 0) {
            total_pages -= 1;
            if (total_pages > 0) {
                getMoreChat(friend, total_pages)
            }
        }
    })

    function getMoreChat(friendName, pageNumber) {
        $.ajax({
            beforeSend: function (xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            type: 'POST',
            data: {
                'friend_name': friendName,
                'page': pageNumber,
            },

            url: '/fectch-messages',
            dataType: 'json',
            success: function (data) {
                console.log(data);
                prependMoreMessages(data.messages, data.user);
                addListenersToDeleteButtons();
            }
        });
        return false; //to prevent the any kind of loading
    }

    function prependMoreMessages(messages, user) {
        for (let i = messages.length-1; i >= 0; i--) {
            let messageDiv = document.createElement('div');
            let date = new Date(messages[i].timestamp);
            let messageDate = getMessageDateTime(date);

            if (user.toString() === messages[i].sender) { //sender message
                messageDiv.classList.add('outgoing-message');
                messageDiv.id = "message" + messages[i].id;
                if (messages[i].deleted) {
                    messageDiv.innerHTML = `<div class="sent-message-content message-content">
                                                <p id="message-content-${messages[i].id}" class="sent-content" style="background-color:#49495a;">
                                                    ${messages[i].content}
                                                </p>
                                                <span class="time-date"></span>
                                         </div>`

                } else {
                    messageDiv.innerHTML = `<div class="sent-message-content message-content">
                                                <p id="message-content-${messages[i].id}" class="sent-content">
                                                    ${messages[i].content}
                                                    <span class="message-options">                                                      
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
                                                                                                    
                                                </p>
                                                <span class="time-date">${messageDate}</span>                                                
                                              </div>`
                }

            }

            // attaching message to amin div
            chattingArea.prepend(messageDiv);
            chattingArea.scrollTop += 1;
        }
    }

});