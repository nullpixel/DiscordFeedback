var commands = []

// Replies Pong! to ping command
commands.ping = {
  adminOnly: false,
  modOnly: false,
  fn: function (client, message) {
    message.reply('Pong!')
  }
}

// Repeats message said by admin but no one else
commands['admin-only'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix) {
    message.channel.sendMessage(suffix)
  }
}

// Repeats message said by mod but no one else
commands['mod-only'] = {
  adminOnly: false,
  modOnly: true,
  fn: function (client, message, suffix) {
    message.channel.sendMessage(suffix)
  }
}

// Closes gateway connection and stops the bot
commands['shutdown'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix) {
    message.reply('Okay, shutting down.')

    console.log('I was shutdown! I would give a talking to', message.author.username, ', I think they were the one who shut me down.')
    client.disconnect()
  }
}

// Searchs for specfied search term through the UserVoice V1 API
commands['uv-search'] = {
  adminOnly: false,
  modOnly: false,
  fn: function (client, message, suffix, UserVoice, uvClient, Config) {
    // Is the full UserVoice search URL
    var userVoiceURL = ['https://' + Config.uservoice.subdomain.trim() + '.' + Config.uservoice.domain.trim() + '/forums/' + Config.uservoice.forumId.trim() + '-' + Config.uservoice.forumName.trim() + '?query=' + encodeURIComponent(suffix.trim())].toString()
    // sends url & search to #bot-log for reasons
    message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' searched for ``' + suffix + '``:\n' + userVoiceURL])
    // sends typing to channel before saying anything
    message.channel.sendTyping()
    // checks if the suffix is blank, if so ask for a search query
    if (suffix === '') {
      message.channel.sendMessage('You need to specify a search query.')
      // If not call the search function to actually search via. UserVoice's API for the query.
      // (UserVoice does the actual searching in their API and returns us the json results)
    } else {
      // call the search function with specfied variables, then resolves the Promise
      search(Config, uvClient, suffix).then(function (search) {
          // Checks if the total returned suggestions is 0, and sends a message to the channel
        if (search.response_data.total_records === 0) {
          message.channel.sendMessage(['There aren\'t any suggestions available with that keyword. This probably means that someone hasn\'t suggested that idea yet. (or maybe you made a typo) :wink: \nCheck out #bot-instructions for info on how to submit your idea.\n' + userVoiceURL])
            // If there is 1 or more suggestions returned send the user a PM with the results
        } else {
          message.channel.sendMessage('We just sent you a PM with the results.')
          message.author.openDM().then(function (dm) {
            dm.sendTyping()
            dm.sendMessage('Here are the suggestions that you searched for:')
          })
            // For each suggestion in the response array, send a embed
          search.suggestions.forEach(function (suggest) {
              // open a new DM channel with the user
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
                  // If the send embed message fail, log the error to console then send a shortened version to the chat
              }).catch(function (e) {
                console.error(e)
                message.channel.sendTyping()
                message.channel.sendMessage(['There was an error:' + '\n```\n' + e + '\n```'])
              })
                // close the DM channel
              dm.close()
            })
          })
            // checks if the total suggestions returned is 5 or more, if so send an embed for the full results
          if (search.response_data.total_records >= 5) {
              // open a DM channel to send the message
            message.author.openDM().then(function (dm) {
              dm.sendTyping()
              dm.sendMessage('For a full list of results, please check out this link:', false, {
                title: 'UserVoice Suggestions Search',
                url: userVoiceURL,
                description: [`"` + suffix + `"` + 'search results for ' + message.author.nickMention].toString(),
                color: 0x3498db,
                author: {
                  name: message.author.username,
                  icon_url: message.author.avatarURL
                }
                  // if sending the message fails, catch that error and send it to console and chat
              }).catch(function (e) {
                console.error(e)
                  // stringify the json so it can be printed in the chat
                var er = JSON.stringify(e)
                message.channel.sendTyping()
                message.channel.sendMessage(['There was an error:' + '\n```\n' + er + '\n```'])
              })
                // close the dm channel
              dm.close()
            })
          }
        }
      })
        // if it fails, log the error to console and report it failed to chat.
        .catch(function (error) {
          console.error(error)
          message.channel.sendTyping()
          message.channel.sendMessage('An Error occured, & the admins have been notified.')
        })
    }
  }
}

commands['uv-comment'] = {
  adminOnly: false,
  modOnly: true,
  fn: function (client, message, suffix, UserVoice, uvClient, Config) {
    if (suffix.split(' ')[0] === 'create') {
      if (typeof Number(suffix.split(' ')[1]) === 'number') {
        if (suffix.split(' ').length >= 3) {
          var comment = suffix.split(' ').slice(2).join(' ')
          var suggestionID = suffix.split(' ')[1]
          getEmail(uvClient, message.author.id).then(function (response) {
            if (response.users[0].email.includes('@')) {
              createComment(Config, uvClient, message, suggestionID, response.users[0].email, comment).then(function (response) {
              // sends comment and url to suggestion to #bot-log for reasons
                message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' commented ' + '`` ' + comment + ' `` on ' + response.comment.suggestion.url])
                message.channel.sendMessage('Here is your sparkling new comment!', false, {
                  title: response.comment.suggestion.title,
                  url: response.comment.suggestion.url,
                  description: response.comment.suggestion.text,
                  color: 0x3498db,
                  author: {
                    name: response.comment.suggestion.creator.name,
                    url: response.comment.suggestion.creator.url,
                    icon_url: response.comment.suggestion.creator.avatar_url
                  },
                  fields: [{
                    name: 'Votes',
                    value: response.comment.suggestion.vote_count
                  }, {
                    name: 'Created',
                    value: new Date(response.comment.suggestion.created_at).toUTCString()
                  }, {
                    name: 'Last updated',
                    value: new Date(response.comment.suggestion.updated_at).toUTCString()
                  }, {
                    name: 'Comment Text',
                    value: response.comment.text
                  }, {
                    name: 'Comment State',
                    value: response.comment.state
                  }, {
                    name: 'Comment Created',
                    value: new Date(response.comment.created_at).toUTCString()
                  }, {
                    name: 'Comment Last Updated',
                    value: new Date(response.comment.updated_at).toUTCString()
                  }]
                }).catch(function (error) {
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['There was an error sending the embed:\n```\n' + JSON.stringify(error, null, '\t') + '\n```'])
                  console.error(error)
                })
              }).catch(function (response) {
                if (response.statusCode === '401') {
                  message.reply('There was an error processing that commend, the admins have been notified.')
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 401 error from UserVoice. Here\'s the data error:'])
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(JSON.parse(response.data), null, '\t').replace('\'', '') + '\n```'])
                } else {
                  message.reply('There was an error processing that commend, the admins have been notified.')
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a error from UserVoice. Here\'s the full error:'])
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t').replace('\'', '') + '\n```'])
                }
                console.log(response)
              })
            } else if (suffix.split(' ')[2].includes('@') !== true) {
              createComment(Config, uvClient, message, suggestionID, emailDefault, comment).then(function (response) {
              // sends comment and url to suggestion to #bot-log for reasons
                message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' commented ' + '`` ' + comment + ' `` on ' + response.comment.suggestion.url])
                message.channel.sendMessage('Here is your sparkling new comment!', false, {
                  title: response.comment.suggestion.title,
                  url: response.comment.suggestion.url,
                  description: response.comment.suggestion.text,
                  color: 0x3498db,
                  author: {
                    name: response.comment.suggestion.creator.name,
                    url: response.comment.suggestion.creator.url,
                    icon_url: response.comment.suggestion.creator.avatar_url
                  },
                  fields: [{
                    name: 'Votes',
                    value: response.comment.suggestion.vote_count
                  }, {
                    name: 'Created',
                    value: new Date(response.comment.suggestion.created_at).toUTCString()
                  }, {
                    name: 'Last updated',
                    value: new Date(response.comment.suggestion.updated_at).toUTCString()
                  }, {
                    name: 'Comment Text',
                    value: response.comment.text
                  }, {
                    name: 'Comment State',
                    value: response.comment.state
                  }, {
                    name: 'Comment Created',
                    value: new Date(response.comment.created_at).toUTCString()
                  }, {
                    name: 'Comment Last Updated',
                    value: new Date(response.comment.updated_at).toUTCString()
                  }]
                }).catch(function (error) {
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['There was an error sending the embed:\n```\n' + JSON.stringify(error, null, '\t') + '\n```'])
                  console.error(error)
                })
              }).catch(function (response) {
                if (response.statusCode === 401) {
                  message.reply('There was an error processing that commend, the admins have been notified.')
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 401 error from UserVoice. Here\'s the data error:'])
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(JSON.parse(response.data), null, '\t').replace('\'', '') + '\n```'])
                } else {
                  message.reply('There was an error processing that commend, the admins have been notified.')
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' got a error from UserVoice. Here\'s the full error:'])
                  message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t').replace('\'', '') + '\n```'])
                }
                console.log(response)
              })
            }
          })
          var emailDefault = Config.uservoice.email.trim()
        } else {
          message.channel.sendMessage('Please include a comment. (otherwise why are you using this command?)')
        }
      } else {
        message.channel.sendMessage('Please include a Suggestion ID.')
      }
    } else if (suffix.split(' ')[0] === 'list') {
      message.channel.sendMessage('This command isn\'t implmented yet.')
    } else {
      message.channel.sendMessage('This subcommand doesn\'t exist. :cry:')
    }
  }
}

exports.Commands = commands

function getEmail (uvClient, guid) {
  return new Promise((resolve, reject) => {
    uvClient.loginAsOwner().then(function (o) {
      o.get('users/search.json', {
        guid: guid
      })
      // Send the reply back to where this function is called so it can be processed.
      .then(resolve)
      // Send the errors out so that they can be handled by the command area.
      // (error **could** be done here, but then we can't send scary msgs in chat as easily)
      .catch(function (error) {
        console.log(error)
      })
    })
  })
}

// Logs into the V1 UserVoice API
function search (Config, uvClient, query) {
  // return a Promise since uvClient.get() returns a Promise
  return new Promise((resolve, reject) => {
    // Convert the UserVoice API url to a string (Needed because of forumId)
    var uV = ['forums/' + Config.uservoice.forumId.trim() + '/suggestions/search.json'].toString()
    // Sends a get request to the URL with the parameters
    uvClient.get(uV, {
      query: query,
      per_page: '5' // set to five results so no more appear in the suggestion array then that (even if there is more results)
    })
      // js Promise stuff
      .then(resolve)
      .catch(reject)
  })
}

function createComment (Config, uvClient, message, suggestionID, email, comment) {
  // return a Promise since uvClient.get() returns a Promise
  return new Promise((resolve, reject) => {
    uvClient.loginAs(email)
      .then(function (t) {
        // Convert the UserVoice API url to a string (Needed because of forumId)
        var uV = ['forums/' + Config.uservoice.forumId.trim() + '/suggestions/' + suggestionID + '/comments.json'].toString()
        // Sends a put request to the URL with the parameters, yes it needs to be like that, blame UserVoice for the stupidity of the parameters.
        t.post(uV, {
          comment: {
            text: comment
          }
        })
          // Send the errors out so that they can be handled by the command area. (error **could** be done here, but then we can't send scary msgs in chat as easily)
          .then(resolve)
          .catch(reject)
      }) // catch any errors from uservoice loginAsOwner and spit them out to console
      .catch(function (response) {
        if (response.statusCode === '401') {
          message.reply('There was an error processing that commend, the admins have been notified.')
          message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 401 error from UserVoice. Here\'s the data error:'])
          message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(JSON.parse(response.data), null, '\t').replace('\'', '') + '\n```'])
        } else {
          message.reply('There was an error processing that commend, the admins have been notified.')
          message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a error from UserVoice. Here\'s the full error:'])
          message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t') + '\n```'])
        }
        console.log(response)
      })
  })
}
