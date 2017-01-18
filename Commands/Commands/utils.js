var commands = []

commands.ping = {
  adminOnly: false,
  modOnly: false,
  fn: function (client, message) {
    message.reply('Pong!')
  }
}

commands['admin-only'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix) {
    message.channel.sendMessage(suffix)
  }
}

commands['mod-only'] = {
  adminOnly: false,
  modOnly: true,
  fn: function (client, message, suffix) {
    message.channel.sendMessage(suffix)
  }
}

commands['shutdown'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix) {
    message.reply('Okay, shutting down.')

    console.log('I was shutdown! I would give a talking to', message.author.username, ', I think they were the one who shut me down.')
    client.disconnect()
  }
}

commands['uv-suggest'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix, UserVoice, uvClient, Config) {
    if (suffix === 'list') {
      message.channel.sendTyping()
      listSuggestions(Config, uvClient)
        .then(function (suggestionsList) {
          suggestionsList.suggestions.forEach(function (suggestions) {
            message.channel.sendMessage('', false, {
                title: suggestions.title,
                url: suggestions.url,
                timestamp: suggestions.created_at,
                color: 0x3498db,
                author: {
                  name: suggestions.creator.name,
                  url: suggestions.creator.url,
                  icon_url: suggestions.creator.avatar_url
                },
                fields: [{
                    name: 'Votes',
                    value: suggestions.vote_count
                  },
                  {
                    name: 'Created',
                    value: suggestions.topic.created_at
                  },
                  {
                    name: 'Last updated',
                    value: suggestions.topic.updated_at
                  }
                ]
              })
              .catch(function (e) {
                console.log(e.response.error)
                message.channel.sendMessage(['There was an error:' + '\n```\n' + e + '\n```'])
              })
          })
        })
        .catch(function (e) {
          console.log(e)
          message.channel.sendMessage(['There was an error:' + '\n```\n' + e + '\n```'])
        })
    } else if (suffix === null) {
      message.channel.sendMessage('You need to specify a command.')
    } else {
      message.channel.sendMessage('No such command. :cry:')
    }
  }
}

commands['uv-search'] = {
  adminOnly: false,
  modOnly: false,
  fn: function (client, message, suffix, UserVoice, uvClient, Config) {
    var userVoiceURL = ['https://' + Config.uservoice.subdomain.trim() + '.' + Config.uservoice.domain.trim() + '/forums/' + Config.uservoice.forumId.trim() + '-' + Config.uservoice.forumName.trim() + '?query=' + encodeURIComponent(suffix.trim())].toString()
    message.channel.sendTyping()
    if (suffix === '') {
      message.channel.sendMessage('You need to specify a search query.')
    } else {
      search(Config, uvClient, suffix).then(function (search) {
          if (search.response_data.total_records === 0) {
            message.channel.sendMessage(['There aren\'t any suggestions available with that keyword. This probably means that someone hasn\'t suggested that idea yet. (or maybe you made a typo) :wink: \nCheck out #bot-instructions for info on how to submit your idea.\n' + userVoiceURL])
          } else {
            message.channel.sendMessage('We just sent you a PM with the results.')
            message.channel.sendTyping()
            message.author.openDM().then(function (dm) {
              dm.sendMessage('Here are the suggestions that you searched for:')
            })
            search.suggestions.forEach(function (suggest) {
              message.author.openDM().then(function (dm) {
                dm.sendTyping()
                dm.sendMessage('', false, {
                  title: suggest.title,
                  url: suggest.url,
                  description: suggest.text,
                  color: 0x3498db,
                  author: {
                    name: suggest.creator.name,
                    url: suggest.creator.url,
                    icon_url: suggest.creator.avatar_url
                  },
                  fields: [{
                    name: 'Votes',
                    value: suggest.vote_count
                  }, {
                    name: 'Created',
                    value: new Date(suggest.created_at).toUTCString()
                  }, {
                    name: 'Last updated',
                    value: new Date(suggest.updated_at).toUTCString()
                  }]

                }).catch(function (e) {
                  console.log(e);
                  sendTyping()
                  message.channel.sendMessage(['There was an error:' + '\n```\n' + e + '\n```'])
                })
                dm.close()
              })
            })
            if (search.response_data.total_records >= 5) {
              message.author.openDM().then(function (dm) {
                dm.sendTyping()
                dm.sendMessage('For a full list of results, please check out this link:', false, {
                  title: "UserVoice Suggestions Search",
                  url: userVoiceURL,
                  description: [`"` + suffix + `"` + 'search results for ' + message.author.nickMention].toString(),
                  color: 0x3498db,
                  author: {
                    name: message.author.username,
                    icon_url: message.author.avatarURL
                  }
                }).catch(function (e) {
                  console.log(e)
                  var er = JSON.stringify(e)
                  message.channel.sendTyping()
                  message.channel.sendMessage(['There was an error:' + '\n```\n' + er + '\n```'])
                })
                dm.close()
              })
            }
          }
        })
        .catch(function (error) {
          console.log(e)
          message.channel.sendTyping()
          message.channel.sendMessage('An Error occured, & the admins have been notified.')
        })
    }
  }
}

exports.Commands = commands

function listSuggestions(Config, uvClient) {
  return new Promise((resolve, reject) => {
    uvClient.loginAsOwner()
    var uV = ['forums/' + Config.uservoice.forumId.trim() + '/suggestions.json']
    uvClient.get(uV.toString(), {
        sort: 'newest'
      })
      .then(resolve)
      .catch(reject)
  })
}

function search(Config, uvClient, query) {
  return new Promise((resolve, reject) => {
    uvClient.loginAsOwner()
    var uV = ['forums/' + Config.uservoice.forumId.trim() + '/suggestions/search.json']
    uvClient.get(uV.toString(), {
        query: query,
        per_page: "5"
      })
      .then(resolve)
      .catch(reject)
  })
}
