# blamebot
Blamebot is a slack slash command bot that dispenses blame without fear or favour

It runs as a microservice on https://webtask.io/ 


1. Clone this repository
1. Create or login to your https://webtask.io/ account
1. Create a new, empty task (call it blamebot or whatever you like) at https://webtask.io/make
1. Overwrite the template code with the contents of [webtask-blamebot.js](../master/webtask-blamebot.js) and save it
1. Copy the url of your new webtask from the bottom of the edit window it should look something like https://wt-random_alphanumerics.run.webtask.io/blamebot
1. Create a slack slash command as per https://api.slack.com/tutorials/your-first-slash-command
    1. Give it a name **/blamebot** or whatever you choose
    1. Paste in the webtask URL from above into the URL field
    1. Set the method to POST
    1. Copy the token string- you will need it for a future step
    1. Set **Escape channels, users, and links** to ON
    1. Customise the name and help text as required.  **who is to blame for global warming?** is a good usage hint
  
1. Return to https://webtask.io/make and open the "Secrets" menu from the Spanner Icon in top left of edit window
  1. Add a secret named **slack_token** with the value you obtained from slack earlier
  1. Optionally create a secret named **forbidden** with a space-seperated list of channels that blamebot will not post in eg **general operations super_serious_channel**
  
Visiting the webtask url  https://wt-random_alphanumerics.run.webtask.io/blamebot?token=your_slack_token should return a json-formatted list, probably empty. If you get "OK" it means your token didnt match what you stored in the secret.
  
**/blamebot #!report**  will list the contents of the datastore for the current channel

**/blamebot #!reset**  will wipe all user-supplied data for this channel



