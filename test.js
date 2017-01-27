        vote(message, uvClient, Config, response.users[0].email, suffix.split(' ')[0]).then(function (response) {
          var userVoiceURL = ['https://' + Config.uservoice.subdomain.trim() + '.' + Config.uservoice.domain.trim() + '/forums/' + Config.uservoice.forumId.trim() + '-' + Config.uservoice.forumName.trim() + '/suggestions/' + suffix.split(' ')[0]].toString()
          message.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' voted on ' + userVoiceURL])
          message.channel.sendMessage(['Your feedback on ' + userVoiceURL])
        }).catch(function (response) {
          if (response.statusCode === 401) {
            message.reply('There was an error processing that commend, the admins have been notified.')
            message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['**' + message.author.username + '#' + message.author.discriminator + '**' + ' has received a 401 error from UserVoice. Here\'s the data error:'])
            message.guild.textChannels.find(c => c.name === 'bot-error').sendMessage(['```json\n' + JSON.stringify(JSON.parse(response.data), null, '\t').replace('\'', '') + '\n```'])
            console.error('UserVoice returned a 401 error:')
            console.error(response)
          } else if (response.statusCode === '404') {
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
