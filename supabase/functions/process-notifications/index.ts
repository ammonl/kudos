import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface SlackMessage {
    channel: string
    blocks: any[]
}

interface KudosData {
    giver: { name: string, id: string }
    categories: { name: string }
    message: string | null
    gif_url: string | null
    kudos_recipients: Array<{ users: { name: string, id: string } }>
}

async function getWeeklyStats(supabaseClient: any, userId: string) {
    // Get user's weekly stats
    const { data: weeklyStats } = await supabaseClient
        .from('kudos_stats_weekly')
        .select('*')
        .eq('user_id', userId)
        .single();

    // Get user's rank
    const { data: allStats } = await supabaseClient
        .from('kudos_stats_weekly')
        .select('*')
        .order('total_points', { ascending: false });

    const userRank = allStats.findIndex((stat: any) => stat.user_id === userId) + 1;

    // Get current leader
    const leader = allStats[0];
    const leaderInfo = leader ? `${leader.name} (${leader.total_points} points)` : 'No leader yet';

    // Get user's top category
    const { data: topCategory } = await supabaseClient
        .from('top_kudos_recipients')
        .select('top_category')
        .eq('user_id', userId)
        .single();

    return {
        kudos_received: weeklyStats?.kudos_received || 0,
        kudos_given: weeklyStats?.kudos_given || 0,
        rank: userRank || 0,
        total_points: weeklyStats?.total_points || 0,
        leader: leaderInfo,
        top_category: topCategory?.top_category || 'None'
    };
}

async function sendSlackNotification(
    notification: any,
    userData: any,
    kudosData: any | null,
    settings: any,
    supabaseClient: any
): Promise<void> {
    // Construct message based on notification type
    let message: SlackMessage;

    switch (notification.type) {
        case 'kudos_received':
            message = {
                channel: settings.slack_user_id,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `Hey <@${settings.slack_user_id}>! You've received kudos from *${kudosData.giver.name}*! :tada:`
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Category:*\n${kudosData.categories.name}`
                            }
                        ]
                    }
                ]
            };

            if (kudosData.message) {
                message.blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Message:*\n${kudosData.message}`
                    }
                });
            }

            if (kudosData.gif_url) {
                message.blocks.push({
                    type: 'image',
                    image_url: kudosData.gif_url,
                    alt_text: 'Kudos GIF'
                });
            }
            break;

        case 'manager_notification':
        case 'other_notification': {
            const recipients = kudosData.kudos_recipients.map((r: any) => r.users.name).join(', ');

            const messageText =
                notification.type === 'manager_notification'
                    ? `Hey <@${settings.slack_user_id}>! Your team member ${recipients} received kudos from *${kudosData.giver.name}*! :star:`
                    : `Hey <@${settings.slack_user_id}>! You should know ${recipients} received kudos from *${kudosData.giver.name}*! :star:`;

            message = {
                channel: settings.slack_user_id,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: messageText,
                        },
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Category:*\n${kudosData.categories.name}`,
                            },
                        ],
                    },
                ],
            };

            if (kudosData.message) {
                message.blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Message:*\n${kudosData.message}`,
                    },
                });
            }

            if (kudosData.gif_url) {
                message.blocks.push({
                    type: 'image',
                    image_url: kudosData.gif_url,
                    alt_text: 'Kudos GIF',
                });
            }
            break;
        }

        case 'weekly_reminder':
            // Get weekly stats
            const stats = await getWeeklyStats(supabaseClient, notification.user_id);

            message = {
                channel: settings.slack_user_id,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `Hey <@${settings.slack_user_id}>! 👋\nThis is your weekly reminder to recognize your colleagues' contributions! Taking a moment to appreciate others can make a big difference in creating a positive work environment.\n\n🌟 <${Deno.env.get('APP_URL')}/give-kudos|Click here> to give kudos to someone!`
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '*Your Activity This Week:*'
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Kudos Received:*\n${stats.kudos_received}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Kudos Given:*\n${stats.kudos_given}`
                            }
                        ]
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Your Position:*\n#${stats.rank}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Total Points:*\n${stats.total_points}`
                            }
                        ]
                    }
                ]
            };

            // Add top category if available
            if (stats.top_category !== 'None') {
                message.blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Your Most Active Category:*\n${stats.top_category}`
                    }
                });
            }

            // Add leader info
            message.blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Current Leader:*\n${stats.leader}`
                }
            });
            break;

        case 'access_request':
            message = {
                channel: settings.slack_user_id,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: notification.message || 'No message provided'
                        }
                    }
                ]
            };
            break;

        default:
            throw new Error(`Unsupported notification type: ${notification.type}`);
    }

    // Add view on web link for kudos notifications
    if (notification.kudos_id) {
        message.blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `View on Kudos: ${Deno.env.get('APP_URL')}/kudos/${notification.kudos_id}`
                }
            ]
        });
    }

    // Send message to Slack
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SLACK_BOT_TOKEN')}`
        },
        body: JSON.stringify(message)
    });

    if (!slackResponse.ok) {
        const errorData = await slackResponse.json();
        throw new Error(`Slack API error: ${errorData.error || slackResponse.statusText}`);
    }
}

async function sendEmailNotification(
    notification: any,
    userData: any,
    kudosData: any | null,
    supabaseClient: any
): Promise<void> {
    let emailContent;

    if (notification.type === 'weekly_reminder') {
        // Get weekly stats
        const stats = await getWeeklyStats(supabaseClient, notification.user_id);

        emailContent = {
            subject: '🌟 Your Weekly Kudos Update',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Kudos Update</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 32px; margin-bottom: 24px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
              <h1 style="margin: 0 0 24px 0; color: #1f2937; font-size: 24px; font-weight: bold; text-align: center;">
                👋 Hello ${userData.name}!
              </h1>
              
              <p style="margin: 0 0 24px 0; text-align: center; color: #6b7280;">
                This is your weekly reminder to recognize your colleagues' contributions! Taking a moment to appreciate others can make a big difference in creating a positive work environment.
              </p>

              <div style="margin-bottom: 32px; text-align: center;">
                <a href="${Deno.env.get('APP_URL')}/give-kudos"
                   style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                  Give Kudos Now
                </a>
              </div>

              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; color: #4f46e5; font-size: 18px; font-weight: 600;">
                  <a href="${Deno.env.get('APP_URL')}/my-kudos" style="color: inherit; text-decoration: none;">📊 Your Weekly Activity</a>
                </h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                  <div style="text-align: center; padding: 16px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                    <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">
                      ${stats.kudos_received}
                    </div>
                    <div style="color: #6b7280; font-size: 14px;">
                      Kudos Received
                    </div>
                  </div>
                  
                  <div style="text-align: center; padding: 16px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                    <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">
                      ${stats.kudos_given}
                    </div>
                    <div style="color: #6b7280; font-size: 14px;">
                      Kudos Given
                    </div>
                  </div>
                </div>

                ${stats.top_category !== 'None' ? `
                  <div style="text-align: center; padding: 16px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); margin-bottom: 16px;">
                    <div style="color: #6b7280; font-size: 14px;">
                      Most Active Category
                    </div>
                    <div style="font-size: 18px; font-weight: 600; color: #4f46e5;">
                      ${stats.top_category}
                    </div>
                  </div>
                ` : ''}
              </div>

              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px;">
                <h2 style="margin: 0 0 16px 0; color: #4f46e5; font-size: 18px; font-weight: 600;">
                  <a href="${Deno.env.get('APP_URL')}/leaderboard" style="color: inherit; text-decoration: none;">🏆 Leaderboard Update</a>
                </h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                  <div style="text-align: center; padding: 16px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                    <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">
                      #${stats.rank}
                    </div>
                    <div style="color: #6b7280; font-size: 14px;">
                      Your Position
                    </div>
                  </div>
                  
                  <div style="text-align: center; padding: 16px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                    <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">
                      ${stats.total_points}
                    </div>
                    <div style="color: #6b7280; font-size: 14px;">
                      Total Points
                    </div>
                  </div>
                </div>

                <div style="text-align: center; padding: 16px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                  <div style="color: #6b7280; font-size: 14px;">
                    Current Leader
                  </div>
                  <div style="font-size: 18px; font-weight: 600; color: #4f46e5;">
                    ${stats.leader}
                  </div>
                </div>
              </div>
            </div>

            <div style="text-align: center; color: #6b7280; font-size: 12px;">
              <p>
                You're receiving this email because you've opted in to weekly updates from Kudos.
                <br>
                To update your notification preferences, visit your <a href="${Deno.env.get('APP_URL')}/settings" style="color: #4f46e5; text-decoration: none;">settings page</a>.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
        };
    } else if (notification.type === 'access_request') {
        emailContent = {
            subject: `Feedback from Kudos`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Kudos Feedback</h2>
          <p>${notification.message}</p>
          <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
            You're receiving this email because you are an admin for the <a href="${Deno.env.get('APP_URL')}">Kudos app</a>.
          </p>
        </div>
      `
        };
    } else if (kudosData) {
        // Handle kudos-related notifications with kudos data
        const recipients = kudosData.kudos_recipients
            .map((r: any) => r.users.name)
            .reduce((acc: string, name: string, index: number, array: string[]) => {
                if (index === array.length - 1) {
                    return acc + (array.length > 1 ? ' and ' : '') + name;
                }
                return acc + (index > 0 ? ', ' : '') + name;
            }, '');

        if (notification.type === 'kudos_received') {
            emailContent = {
                subject: `You received kudos from ${kudosData.giver.name}!`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You received kudos!</h2>
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #4F46E5; margin: 0 0 8px 0;">Category: ${kudosData.categories.name}</p>
              <p style="margin: 0 0 16px 0;">${kudosData.message}</p>
              ${kudosData.gif_url ? `<img src="${kudosData.gif_url}" alt="Kudos GIF" style="max-width: 200px; border-radius: 4px;">` : ''}
              <p style="color: #6B7280; margin: 16px 0 0 0;">From: ${kudosData.giver.name}</p>
            </div>
            <a href="${Deno.env.get('APP_URL')}/kudos/${kudosData.id}" 
               style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Kudos
            </a>
          </div>
        `
            };
        } else if (notification.type === 'manager_notification') {
            emailContent = {
                subject: `Your team member received kudos!`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Team Recognition Alert</h2>
            <p>${recipients} received kudos from ${kudosData.giver.name}!</p>
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #4F46E5; margin: 0 0 8px 0;">Category: ${kudosData.categories.name}</p>
              <p style="margin: 0 0 16px 0;">${kudosData.message}</p>
              ${kudosData.gif_url ? `<img src="${kudosData.gif_url}" alt="Kudos GIF" style="max-width: 200px; border-radius: 4px;">` : ''}
            </div>
            <a href="${Deno.env.get('APP_URL')}/kudos/${kudosData.id}" 
               style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Kudos
            </a>
          </div>
        `
            };
        } else {
            // Handle additional notifications
            emailContent = {
                subject: `Kudos Recognition Notification`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Kudos Recognition Notification</h2>
            <p>${recipients} received kudos from ${kudosData.giver.name}!</p>
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #4F46E5; margin: 0 0 8px 0;">Category: ${kudosData.categories.name}</p>
              <p style="margin: 0 0 16px 0;">${kudosData.message}</p>
              ${kudosData.gif_url ? `<img src="${kudosData.gif_url}" alt="Kudos GIF" style="max-width: 200px; border-radius: 4px;">` : ''}
            </div>
            <a href="${Deno.env.get('APP_URL')}/kudos/${kudosData.id}" 
               style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Kudos
            </a>
          </div>
        `
            };
        }
    } else {
        // Fallback for any other notifications
        emailContent = {
            subject: `Kudos Notification`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Kudos Notification</h2>
          <p>You have a new notification from Kudos.</p>
          <a href="${Deno.env.get('APP_URL')}" 
              style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Kudos
          </a>
        </div>
      `
        };
    }

    const sendgridData = {
        personalizations: [
            {
                to: [{ email: userData.email }],
                subject: `${emailContent.subject}`,
            },
        ],
        from: {
            email: 'no-reply@ammonlarson.com', // This must be a verified sender in SendGrid
            name: 'Kudos',
        },
        content: [
            {
                type: 'text/html',
                value: emailContent.html,
            },
        ],
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        },
        body: JSON.stringify(sendgridData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.errors?.map((e: any) => e.message).join(', ') || response.statusText;
        throw new Error(`SendGrid API error: ${errorMessage}`);
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Atomically claim a batch of notifications for processing
        const batch_process_size = 10; // Configurable batch size
        const { data: notifications, error: rpcError } = await supabaseClient
            .rpc('claim_pending_notifications', { batch_size: batch_process_size });

        if (rpcError) {
            console.error(`Error claiming notifications via RPC: ${rpcError.message}`, rpcError);
            throw new Error(`Failed to claim notifications: ${rpcError.message}`);
        }

        if (!notifications || notifications.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    processed: 0,
                    message: "No pending notifications to process."
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        var mailSent = false; // Used to provide delays between mail notifications.

        for (const notification of notifications) {
            console.log(`Processing notification ID: ${notification.id}, Type: ${notification.type}, Channel: ${notification.channel}`);

            try {
                // Get user data
                const { data: userData, error: userError } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('id', notification.user_id)
                    .single();

                if (userError) throw userError;

                // Get user's notification settings
                const { data: settings, error: settingsError } = await supabaseClient
                    .from('settings')
                    .select('*')
                    .eq('user_id', notification.user_id)
                    .single();

                if (settingsError) throw settingsError;

                // Get kudos data if this is a kudos-related notification
                let kudosData = null;
                if (notification.kudos_id) {
                    const { data, error: kudosError } = await supabaseClient
                        .from('kudos')
                        .select(`
              *,
              giver:users!kudos_giver_id_fkey (name, id),
              categories (name, id),
              kudos_recipients (
                users (name, id)
              )
            `)
                        .eq('id', notification.kudos_id)
                        .single();

                    if (kudosError) throw kudosError;
                    kudosData = data;
                }

                // Process based on notification channel
                if (notification.channel === 'email') {
                    if (mailSent) {
                        // Wait 1 second before sending the next email to prevent throttling by the email provider
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    await sendEmailNotification(notification, userData, kudosData, supabaseClient);
                    mailSent = true;

                    console.log(`[${notification.id}] Email sent to ${userData.email}`);
                } else if (notification.channel === 'slack') {
                    if (!settings?.slack_user_id) {
                        throw new Error('No Slack user ID found for user');
                    }
                    await sendSlackNotification(notification, userData, kudosData, settings, supabaseClient);
                    console.log(`[${notification.id}] Slack message sent to ${settings.slack_user_id}`);
                }

                // Mark notification as sent
                const { error: updateError } = await supabaseClient
                    .from('notification_queue')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        error: null // Clear any previous error message
                    })
                    .eq('id', notification.id)
                    .eq('status', 'processing'); // Ensure we only update if it was claimed by this instance

                if (updateError) throw updateError;
                console.log(`[${notification.id}] Notification marked as sent.`);
            } catch (error) {
                console.error(`[${notification.id}] Error processing notification: ${error.message}`);

                // Mark notification as failed
                await supabaseClient
                    .from('notification_queue')
                    .update({
                        status: 'failed',
                        error: error.message
                    })
                    .eq('id', notification.id)
                    .eq('status', 'processing'); // Ensure we only update if it was claimed by this instance

                console.log(`[${notification.id}] Notification marked as failed`);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: notifications.length
            }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        );
    }
});