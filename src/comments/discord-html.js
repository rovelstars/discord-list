function extremelyLongMessagePreview(data) {
  return `<div id="message-${
    data.id
  }" class="rounded flex-vertical whitney theme-dark">
    <div class="rounded chat flex-vertical flex-spacer">
        <div class="rounded content flex-spacer flex-horizontal">
            <div class="rounded flex-spacer flex-vertical messages-wrapper">
                <div class="scroller-wrap">
                    <div class="scroller messages">
                        <div class="message-group hide-overflow">
                            <div class="avatar-large animate" style="background-image: url(${
                              user
                                ? user.avatarUrl
                                : "https://cdn.discordapp.com/embed/avatars/0.png"
                            })"></div>
                            <div class="comment">${getMessage(data)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>`;
}

function getMessage(data) {
  const emojiregex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/g;
  var founded = data.message.match(emojiregex);
  if (founded) {
    var oldemojis = founded;
    founded = founded.map((emoji) => {
      emoji = emoji.split(":");
      const ani = emoji[0] == "<a" ? true : false;
      if (emoji.length == 3) {
        emoji.shift();
      }
      emoji[1] = emoji[1].replace(">", "");
      return `<img ${
        data.message == oldemojis.join(" ") ||
        data.message == oldemojis.join("")
          ? ""
          : 'class="emoji"'
      } src="https://cdn.discordapp.com/emojis/${emoji[1]}.${
        ani ? "gif" : "png"
      }" alt="${emoji[0]}" />`;
    });
    for (var i = 0; i <= founded.length; i++) {
      data.message = data.message.replace(oldemojis[i], founded[i]);
    }
  }

  return `<div class="message first">
        <h2 style="line-height: 16px;">
            <span class="username-wrapper v-btm">
                <strong class="user-name">${
                  user ? user.username : "User"
                }</strong>
            </span>
            <span class="highlight-separator"> - </span>
            <span class="timestamp">${toTimestamp(
              new Date(data.createdAt)
            )}</span>
        </h2>
        <div innerHtml="processed" class="message-text">${data.message}</div>
    </div>
    ${
      data.embed
        ? `<div class="embed">
        <a class="title" href="${data.url}">${data.embed.title}</a>
        <div class="description">${data.embed.description}</div>
        ${
          data.embed.image && !data.embed.video
            ? `<img src="${data.embed.image}" onerror="this.onerror=null;this.hidden = true">`
            : ""
        }
      </div>`
        : ``
    }`;
}

function toTimestamp(date) {
  const timestamp = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "numeric",
  });

  const wasToday = new Date().getDay() / date.getDay() === 1;
  const wasYesterday = new Date().getDate() % date.getDate() === 1;
  const isTommorow = date.getTime() % new Date().getDate() === 1;

  if (wasToday || wasYesterday) return `Today at ${timestamp}`;
  if (wasYesterday) return `Yesterday at ${timestamp}`;
  else if (isTommorow) return `Tommorow at ${timestamp}`;

  return date.toJSON().slice(0, 10).split("-").reverse().join("/");
}
