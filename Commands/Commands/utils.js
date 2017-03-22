var commands = []
var state = {}
var checker = require('../../Utils/access_checker')
var config = require('../../config.js')

// Replies Pong! to ping command
commands.ping = {
    adminOnly: true,
    modOnly: false,
    fn: function (client, message) {
        message.reply('Pong!')
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
commands['search'] = {
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
            message.reply('You need to specify a search query.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                message.delete()
                deleteThis(msg)
            })
            // If not call the search function to actually search via. UserVoice's API for the query.
            // (UserVoice does the actual searching in their API and returns us the json results)
        } else {
            // call the search function with specfied variables, then resolves the Promise
            search(Config, uvClient, suffix).then(function (search) {
                    // Checks if the total returned suggestions is 0, and sends a message to the channel
                    if (search.response_data.total_records === 0) {
                        message.reply(['There aren\'t any suggestions available with that keyword. This probably means that someone hasn\'t suggested that idea yet. (or maybe you made a typo) :wink: \nCheck out #bot-instructions for info on how to submit your idea.\n' + userVoiceURL]).then(delay(config.timeouts.messageDelete)).then((msg) => {
                          message.delete()
                          deleteThis(msg)
                        })
                        // If there is 1 or more suggestions returned send the user a PM with the results
                    } else {
                        message.reply('I just DMed you with the results.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                          message.delete()
                          deleteThis(msg)
                        })
                        let top = search.suggestions.slice(0,5);
                        let list = top.map(suggest => `» [${suggest.title}](${suggest.url})`).join("\n");
                        message.author.openDM().then(function (dm) {
                            dm.sendTyping()
                            dm.sendMessage("Here are the suggestions that you searched for:", false, {
                                title: "Search: Top 5 results",
                                description: `${list}\n\nYou can find a full list of suggestions [here](${userVoiceURL})`,
                                color: 0x3498db
                                // If the send embed message fail, log the error to console then send a shortened version to the chat
                            }).catch(function (e) {
                                console.error(e)
                                message.channel.sendTyping()
                                message.channel.sendMessage(['There was an error:' + '\n```\n' + e + '\n```'])
                            })
                            // close the DM channel
                            dm.close()
                        })
                    }
                })
                // if it fails, log the error to console and report it failed to chat.
                .catch(function (error) {
                  console.error(error)
                  message.channel.sendTyping()
                  message.reply('An Error occured, I have notified the admins.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                    message.delete()
                    deleteThis(msg)
                })
            })
        }
    }
}

commands['comment'] = {
    adminOnly: false,
    modOnly: false,
    fn: function (client, message, suffix, UserVoice, uvClient, Config) {
        if (typeof Number(suffix.split(' ')[1]) === 'number') {
            if (suffix.split(' ').length >= 3) {
                var comment = suffix.split(' ').slice(1).join(' ')
                var suggestionID = suffix.split(' ')[0]
                getEmail(uvClient, message.author.id, message).then(function (email) {
                    if (email.users[0].email.includes('@')) {
                        createComment(Config, uvClient, message, suggestionID, email.users[0].email, comment).then(function (commentResponse) {
                            // sends comment and url to suggestion to #bot-log for reasons
                            message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' commented ' + '`` ' + comment + ' `` on ' + commentResponse.comment.suggestion.url])
                            message.channel.sendMessage(['Here is your sparkling new comment! ' + commentResponse.comment.suggestion.url], false, {
                                title: commentResponse.comment.suggestion.title,
                                url: commentResponse.comment.suggestion.url,
                                description: commentResponse.comment.text,
                                color: 0x3498db,
                                author: {
                                    name: commentResponse.comment.creator.name,
                                    url: commentResponse.comment.creator.url,
                                    icon_url: commentResponse.comment.creator.avatar_url
                                },
                                fields: [{
                                    name: 'Comment State',
                                    value: commentResponse.comment.state
                                }, {
                                    name: 'Comment Created',
                                    value: new Date(commentResponse.comment.created_at).toUTCString()
                                }, {
                                    name: 'Comment Last Updated',
                                    value: new Date(commentResponse.comment.updated_at).toUTCString()
                                }, {
                                    name: 'Votes For Suggestion',
                                    value: commentResponse.comment.suggestion.vote_count
                                }, {
                                    name: 'Suggestion Created',
                                    value: new Date(commentResponse.comment.suggestion.created_at).toUTCString()
                                }, {
                                    name: 'Suggestion Last updated',
                                    value: new Date(commentResponse.comment.suggestion.updated_at).toUTCString()
                                }]
                            }).catch(function (error) {
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['There was an error sending the embed:\n```\n' + JSON.stringify(error, null, '\t') + '\n```'])
                                console.error(error)
                            })
                        }).catch(function (response) {
                            if (response.statusCode === 401) {
                                message.reply('There was an error processing that command, the admins have been notified.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                                  message.delete()
                                  deleteThis(msg)
                                })
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 401 error from UserVoice. Here\'s the data error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(JSON.parse(response.data), null, '\t').replace('\'', '') + '\n```'])
                            } else if (response.statusCode === 404) {
                                message.reply('That suggestion ID doesn\'t exist, please give a valid suggestionID.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                                  message.delete()
                                  deleteThis(msg)
                                })
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 404 error from UserVoice. Here\'s the data error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t').replace('\'', '') + '\n```'])
                            } else {
                                message.reply('There was an error processing that command, the admins have been notified.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                                  message.delete()
                                  deleteThis(msg)
                                })
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a error from UserVoice. Here\'s the full error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t').replace('\'', '') + '\n```'])
                            }
                            console.error(response)
                        })
                    }
                }).catch(function (error) {
                    console.error(error)
                })
                var emailDefault = Config.uservoice.email.trim()
            } else {
                message.reply('You need to provide the message to be added by the ticket, separated by a pipe |').then(delay(config.timeouts.messageDelete)).then((msg) => {
                  message.delete()
                  deleteThis(msg)
              })
            }
        } else {
            message.reply('You need to include the ID for the suggestion you want to add a comment to, separated by a pipe |').then(delay(config.timeouts.messageDelete)).then((msg) => {
                message.delete()
                deleteThis(msg)
            })
        }
    }
}
commands['duplicate'] = {
    adminOnly: false,
    modOnly: true,
    fn: function (client, message, suffix, UserVoice, uvClient, Config) {
        let content = suffix.split(' | ')
        if (content.length === 2) {
            if (content[1] !== null) {
                if (content[0] === content[1]) {
                    message.reply("You cannot mark the same report as a duplicate.").then(delay(config.timeouts.messageDelete)).then((msg) => {
                        message.delete()
                        deleteThis(msg)
                    })
                    return
                } 
                if (content[0].indexOf('http') === -1 || content[1].indexOf('http') === -1) {
                    message.reply("You need to specify a report **URL**, not an ID.").then(delay(config.timeouts.messageDelete)).then((msg) => {
                        message.delete()
                        deleteThis(msg)
                    })
                    return
                }
                message.reply(`You are about to mark ${content[0]} as a duplicate of ${content[1]}, are you sure this is correct? (yes/no)`)
                wait(client, message).then((response) => {
                    if (response === false) {
                        message.reply('You took too long to anwser, the operation has been cancelled.')
                    } else if (response === 'no') {
                        message.reply('Thanks for reconsidering, the operation has been cancelled.')
                    } else if (response === 'yes') {
                        message.reply('Thanks for your report! We\'ve asked the custodians to review your report, you should hear from us soon!')
                        let uuid = require('uuid')
                        let code = uuid.v4().split('-')[0]
                        state[code] = {
                            denial: [],
                            approvedUsers: [],
                            deniedUsers: [],
                            approval: [],
                            user: message.author.id,
                            type: 'dupe',
                            remove: content[0],
                            sudo: true
                        }
                        message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['---------------------------------------------\n' + '**' + message.author.username + '#' + message.author.discriminator + '**' + ' submitted a duplicate report: ' + code + ' (<' + content[0] + '> vs <' + content[1] + '>)'])
                        message.guild.channels.find(c => c.name === 'admin-queue').sendMessage(`**${message.author.username}#${message.author.discriminator}** marked ${content[0]} as a duplicate of ${content[1]}.\n\nThis report needs to be approved: **ID**: ${code}`)
                    }
                })
            } else {
              message.reply("You need to provide two URLs and separate them with a pipe |").then(delay(config.timeouts.messageDelete)).then((msg) => {
                  message.delete()
                  deleteThis(msg)
              })
              return
            }
        } else {
            message.reply("This command only takes two arguments. Please ensure you have specfied two urls, seperated by a pipe.").then(delay(config.timeouts.messageDelete)).then((msg) => {
                message.delete()
                deleteThis(msg)
            })
            return
        }
    }
}

commands['approve'] = {
    adminOnly: false,
    modOnly: true,
    fn: function (client, message, suffix, UserVoice, uvClient, Config) {
        let content = suffix.split(' | ')
        let channel = client.Channels.find((c) => c.name === 'approval-queue')
        channel.fetchMessages().then(() => {
            var toEdit = channel.messages.find((c) => c.author.id === client.User.id && c.content.split('**ID**: ')[1] !== undefined && c.content.split('**ID**: ')[1].split('\n')[0] === content[0])
            if (!toEdit) {
                message.reply('No report was found with this ID').then(delay(config.timeouts.messageDelete)).then((msg) => {
                  message.delete()
                  deleteThis(msg)
                })
                return
            } else {
                if (state[content[0]].deniedUsers.indexOf(message.author.id) > -1 || state[content[0]].approvedUsers.indexOf(message.author.id) > -1) {
                    message.reply("You've already given your input on this feedback.").then(delay(config.timeouts.messageDelete)).then((msg) => {
                        message.delete()
                        deleteThis(msg)
                    })
                    return
                }
                checker.getLevel(message.member, (r) => {
                    if (state[content[0]].sudo && r !== 2) {
                        message.reply('You need to be an admin to approve this report.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                            message.delete()
                            deleteThis(msg)
                        })
                        return
                    }
                    if (state[content[0]].user === message.author.user) {
                        message.reply('You cannot approve your own submission.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                            message.delete()
                            deleteThis(msg)
                        })
                        return
                    }
                    if (state[content[0]].approval.length === config.discord.approveThreshold) {
                        message.reply('This report has already been closed.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                            message.delete()
                            deleteThis(msg)
                        })
                        return
                    }
                    state[content[0]].approval.push((content[1]) ? content[1] : '*No comment*')
                    state[content[0]].approvedUsers.push(message.author.id);
                    message.reply(`You've successfully submitted your approval for this report.`).then(delay(config.timeouts.messageDelete)).then((msg) => {
                        message.delete()
                        deleteThis(msg)
                    })
                    message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' approved submission ' + content[0]])
                    if (state[content[0]].sudo) {
                        approve(client, content[0], uvClient, Config)
                        setTimeout(() => {
                            toEdit.delete()
                        }, 2500)
                        return
                    }
                    if (state[content[0]].approval.length === config.discord.approveThreshold) {
                        approve(client, content[0], uvClient, Config)
                        setTimeout(() => {
                            toEdit.delete()
                        }, 2500)
                    } else {
                        toEdit.edit(toEdit.content + `\n✅ ${message.author.username}#${message.author.discriminator} **APPROVED** this report`)
                    }
                })
            }
        })
    }
}

commands['deny'] = {
    adminOnly: false,
    modOnly: true,
    fn: function (client, message, suffix, UserVoice, uvClient, Config) {
        let content = suffix.split(' | ')
        let channel = client.Channels.find((c) => c.name === 'approval-queue')
        if (content.length !== 2 || content[1].length === 0) {
            message.reply('You need to supply a reason to deny this report.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                message.delete()
                deleteThis(msg)
            })
            return
        }
        channel.fetchMessages().then(() => {
            var toEdit = channel.messages.find((c) => c.author.id === client.User.id && c.content.split('**ID**: ')[1] !== undefined && c.content.split('**ID**: ')[1].split('\n')[0] === content[0])
            if (!toEdit) {
                message.reply('No report was found with that ID').then(delay(config.timeouts.messageDelete)).then((msg) => {
                    message.delete()
                    deleteThis(msg)
                })
            } else {
                if (state[content[0]].deniedUsers.indexOf(message.author.id) > -1 || state[content[0]].approvedUsers.indexOf(message.author.id) > -1) {
                    message.reply("You've already given your input on this feedback.").then(delay(config.timeouts.messageDelete)).then((msg) => {
                        message.delete()
                        deleteThis(msg)
                    })
                    return
                }
                checker.getLevel(message.member, (r) => {
                    if (state[content[0]].sudo && r !== 2) {
                        message.reply('You need to be an admin to deny this report.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                            message.delete()
                            deleteThis(msg)
                        })
                        return
                    }
                    if (state[content[0]].denial.length === config.discord.denyThreshold) {
                        message.reply('This report has already been closed.').then(delay(config.timeouts.messageDelete)).then((msg) => {
                            message.delete()
                            deleteThis(msg)
                        })
                        return
                    }
                    state[content[0]].denial.push(content[1])
                    state[content[0]].deniedUsers.push(message.author.id);
                    message.reply(`You've successfully submitted your denial for this report.`).then(delay(config.timeouts.messageDelete)).then((msg) => {
                        message.delete()
                        deleteThis(msg)
                    })
                    message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' denied submission ' + content[0] + ' because `' + content[1] + '`'])
                    if (state[content[0]].sudo) {
                        deny(client, content[0])
                        setTimeout(() => {
                            toEdit.delete()
                        }, 2500)
                        return
                    }
                    if (state[content[0]].denial.length === config.discord.denyThreshold) {
                        deny(client, content[0])
                        setTimeout(() => {
                            toEdit.delete()
                        }, 2500)
                    } else {
                        toEdit.edit(toEdit.content + `\n🚫 ${message.author.username}#${message.author.discriminator} **DENIED** this report because: \`${content[1]}\``)
                    }
                })
            }
        })
    }
}

commands['submit'] = {
    adminOnly: false,
    modOnly: false,
    fn: function (client, message, suffix, UserVoice, uvClient, Config) {
        let channels = require('../../channels')
        let IDs = Object.getOwnPropertyNames(channels)
        if (IDs.indexOf(message.channel.id) === -1) return
        let content = suffix.split(' | ')
        if (content.length !== 2) {
            message.reply('This command only takes 2 arguments')
        } else {
            let title = content[0]
            let description = content[1]
            message.channel.sendTyping()
            getEmail(uvClient, message.author.id, message).then(function (user) {
                let uuid = require('uuid')
                let code = uuid.v4().split('-')[0]
                let template = `---------------------------------------------\n <#${message.channel.id}>: **${message.author.username}#${message.author.discriminator}** submitted new feedback \n${title}\n${description}.\n\nThis needs to be approved: **ID**: ${code}`
                if (template.length > 2000) {
                    message.reply("the resulting message will be too long for me to process, can you please shorten it?")
                    return
                }
                state[code] = {
                    user: message.author.id,
                    denial: [],
                    approval: [],
                    approvedUsers: [],
                    category: channels[message.channel.id],
                    deniedUsers: [],
                    email: user.users[0].email,
                    title: title,
                    desc: description,
                    type: 'newCard'
                }
                message.channel.sendMessage(['Thank you for your feedback!\nWe\'ve send it to the custodians for review!']).then(delay(config.timeouts.messageDelete)).then((msg) => {
                    message.delete()
                    deleteThis(msg)
                })
                message.guild.channels.find(c => c.name === 'approval-queue').sendMessage(template)
                message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' submitted new feedback: (' + code + ' **' + title + '**)'])
            })
        }
    }
}

commands['uv'] = {
    adminOnly: false,
    modOnly: false,
    fn: function (client, message, suffix, UserVoice, uvClient, Config) {
        if (suffix.split(' ').length >= 3) {
            message.reply('This command only takes 1 suggestion ID as a argument')
        } else if (suffix.split(' ').length >= 2) {
            getEmail(uvClient, message.author.id, message).then(function (email) {
                if (suffix.split(' ')[0] === 'vote') {
                    vote(message, uvClient, Config, email.users[0].email, suffix.split(' ')[1], 1)
                        .then(function (vote) {
                            var userVoiceURL = ['https://' + Config.uservoice.subdomain.trim() + '.' + Config.uservoice.domain.trim() + '/forums/' + Config.uservoice.forumId.trim() + '-' + Config.uservoice.forumName.trim() + '/suggestions/' + suffix.split(' ')[1]].toString()
                            message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' voted on ' + userVoiceURL])
                            message.channel.sendMessage(['You successfully voted on ' + userVoiceURL], null, {
                                title: vote.suggestion.title,
                                url: vote.suggestion.url,
                                description: vote.suggestion.text,
                                color: 0x3498db,
                                author: {
                                    name: vote.suggestion.creator.name,
                                    url: vote.suggestion.creator.url,
                                    icon_url: vote.suggestion.creator.avatar_url
                                },
                                fields: [{
                                    name: 'Suggestion Votes',
                                    value: vote.suggestion.vote_count
                                }, {
                                    name: 'Suggestion Created',
                                    value: new Date(vote.suggestion.created_at).toUTCString()
                                }, {
                                    name: 'Suggestion Last updated',
                                    value: new Date(vote.suggestion.updated_at).toUTCString()
                                }]
                            })
                        }).catch(function (response) {
                            if (response.statusCode === 401) {
                                message.reply('There was an error processing that command, the admins have been notified.')
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 401 error from UserVoice. Here\'s the data error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(JSON.parse(response.data), null, '\t').replace('\'', '') + '\n```'])
                                console.error('UserVoice returned a 401 error:')
                                console.error(response)
                            } else if (response.statusCode === 404) {
                                message.reply('That suggestion ID doesn\'t exist, please give a valid suggestionID.')
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 404 error from UserVoice. Here\'s the data error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t').replace('\'', '') + '\n```'])
                                console.error('UserVoice returned a 404 error:')
                                console.error(response)
                            } else {
                                message.reply('There was an error processing that commend, the admins have been notified.')
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' got a error from UserVoice. Here\'s the full error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t').replace('\'', '') + '\n```'])
                                console.error('UserVoice returned a unknown error:')
                                console.error(response)
                            }
                        })
                } else if (suffix.split(' ')[0] === 'unvote') {
                    vote(message, uvClient, Config, email.users[0].email, suffix.split(' ')[1], 0)
                        .then(function (vote) {
                            var userVoiceURL = ['https://' + Config.uservoice.subdomain.trim() + '.' + Config.uservoice.domain.trim() + '/forums/' + Config.uservoice.forumId.trim() + '-' + Config.uservoice.forumName.trim() + '/suggestions/' + suffix.split(' ')[1]].toString()
                            message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' removed their vote from ' + userVoiceURL])
                            message.channel.sendMessage(['You successfully removed your vote from ' + userVoiceURL], null, {
                                title: vote.suggestion.title,
                                url: vote.suggestion.url,
                                description: vote.suggestion.text,
                                color: 0x3498db,
                                author: {
                                    name: vote.suggestion.creator.name,
                                    url: vote.suggestion.creator.url,
                                    icon_url: vote.suggestion.creator.avatar_url
                                },
                                fields: [{
                                    name: 'Suggestion Votes',
                                    value: vote.suggestion.vote_count
                                }, {
                                    name: 'Suggestion Created',
                                    value: new Date(vote.suggestion.created_at).toUTCString()
                                }, {
                                    name: 'Suggestion Last updated',
                                    value: new Date(vote.suggestion.updated_at).toUTCString()
                                }]
                            }).catch(function (error) {
                                message.reply('There was an error processing that command, the admins have been notified.')
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage([' there was an error sending the embed that ' + '**' + message.author.username + '#' + message.author.discriminator + '**' + ' should\'ve received.'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(error, null, '\t') + '\n```'])
                                console.error('There was an error sending the message to Discord.')
                                console.error(error)
                            })
                        }).catch(function (response) {
                            if (response.statusCode === 401) {
                                message.reply('There was an error processing that command, the admins have been notified.')
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 401 error from UserVoice. Here\'s the data error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(JSON.parse(response.data), null, '\t').replace('\'', '') + '\n```'])
                                console.error('UserVoice returned a 401 error:')
                                console.error(response)
                            } else if (response.statusCode === 404) {
                                message.reply('That suggestion ID doesn\'t exist, please give a valid suggestionID.')
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 404 error from UserVoice. Here\'s the data error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t').replace('\'', '') + '\n```'])
                                console.error('UserVoice returned a 404 error:')
                                console.error(response)
                            } else {
                                message.reply('There was an error processing that commend, the admins have been notified.')
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' got a error from UserVoice. Here\'s the full error:'])
                                message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(response, null, '\t').replace('\'', '') + '\n```'])
                                console.error('UserVoice returned a unknown error:')
                                console.error(response)
                            }
                        })
                } else {
                    message.reply('Please specify whether or not you want to vote, or unvote the specfied suggestion.')
                }
            })
        } else {
            message.channel.sendMessage('Please specify a suggestion ID &/or, vote or unvote')
        }
    }
}

exports.Commands = commands

function wait(bot, msg) {
    return new Promise((resolve, reject) => {
        bot.Dispatcher.on('MESSAGE_CREATE', function doStuff(c) {
            var time = setTimeout(() => {
                resolve(false)
                bot.Dispatcher.removeListener('MESSAGE_CREATE', doStuff)
            }, config.timeouts.duplicateConfirm) // We won't wait forever for the person to anwser
            if (c.message.channel.id !== msg.channel.id) return
            if (c.message.author.id !== msg.author.id) return
            if (c.message.content.toLowerCase() !== 'yes' && c.message.content.toLowerCase() !== 'no') return
            else {
                resolve(c.message.content.toLowerCase())
                bot.Dispatcher.removeListener('MESSAGE_CREATE', doStuff)
                clearTimeout(time)
            }
        })
    })
}

function delay(delayMS) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), delayMS)
    })
}

function getEmail(uvClient, guid, message) {
    return new Promise((resolve, reject) => {
        uvClient.loginAsOwner().then(function (o) {
            o.get('users/search.json', {
                    guid: guid
                })
                // Send the reply back to where this function is called so it can be processed.
                .then(resolve)
                .catch(reject)
        }).catch(function (response) {
            console.error(response)
            // message can be null, allowing it to be used out of message context
            // I am aware how this isn't how promises work, but for usability sake, this is what I'm doing ~ null
            if (message !== null) {
                if (response.statusCode === 401) message.reply(`In order to use commands you have to be logged into the feedback site. Just go to <https://feedback.discordapp.com> and click on the Sign In button.`);
            }
        })
    })
}

function deleteThis(message) {
    setTimeout(() => message.delete(), 1250)
}

// Logs into the V1 UserVoice API
function search(Config, uvClient, query) {
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

function createComment(Config, uvClient, message, suggestionID, email, comment) {
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
                console.error(response)
            })
    })
}

function submit(user, title, description, cat, uvClient, Config) {
    return new Promise((resolve, reject) => {
        uvClient.loginAs(user).then(function (v) {
            var uv = ['forums/' + Config.uservoice.forumId.trim() + '/suggestions.json'].toString()
            v.post(uv, {
                    suggestion: {
                        title: title,
                        text: description,
                        votes: 1,
                        category_id: cat
                    }
                })
                .then(resolve)
                .catch(reject)
        }).catch(function (response) {
            console.error(response)
        })
    })
}

function approve(client, id, UV, config) {
    client.Users.get(state[id].user).openDM().then(c => {
        let message = [
            'Hello there!',
            `Good news! Your submission with ID ${id} has been approved!`,
            "Thank you for helping make Discord better, we look forward to future suggestions!"
        ]
        c.sendMessage(message.join('\n'))
        switch (state[id].type) {
        case 'dupe':
            {
                deleteFromUV(state[id].remove, UV).catch(console.error)
                break
            }
        case 'newCard':
            {
                let data = state[id]
                submit(data.email, data.title, data.desc, data.category, UV, config).catch(console.error)
                break
            }
        default:
            {
                console.error(`Warning! No suitable action found for report type ${state[id].type}!`)
                break
            }
        }
    })
}

function deleteFromUV(toDelete, uvClient) {
    return new Promise((resolve, reject) => {
        let UVRegex = /http[s]?:\/\/[\w.]*\/forums\/([0-9]{6,})-[\w-]+\/suggestions\/([0-9]{8,})-[\w-]*/
        let parts = toDelete.match(UVRegex)
        if (parts === null) {
            return reject('Invalid URL passed')
        }
        let forumID = parts[1]
        let suggestionID = parts[2]
        uvClient.loginAsOwner().then(function (v) {
            var uv = `forums/${forumID}/suggestions/${suggestionID}.json`
            v.delete(uv)
                .then(resolve)
                .catch(reject)
        })
    })
}

function deny(client, id) {
    client.Users.get(state[id].user).openDM().then(c => {
        let message = [
            'Hello there!',
            `Sorry, but your submission with ID ${id} has been denied.`,
            "Thanks for participating, and we're looking forward to your next submission."
        ]
        c.sendMessage(message.join('\n'))
    })
}

function vote(message, uvClient, Config, email, suggestionID, vote) {
    return new Promise((resolve, reject) => {
        uvClient.loginAs(email).then(function (v) {
            var uv = ['forums/' + Config.uservoice.forumId + '/suggestions/' + suggestionID + '/votes.json'].toString()
            v.post(uv, {
                    to: vote
                })
                .then(resolve)
                .catch(reject)
        }).catch(function (response) {
            console.error(response)
        })
    })
}