import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
})

export async function generateKudosMessage({
                                               recipients,
                                               category,
                                               keywords,
                                               tone = 'professional'
                                           }: {
    recipients: { name: string }[]
    category: { name: string }
    keywords?: string
    tone?: 'professional' | 'casual' | 'fun'
}) {
    // Get first names only
    const recipientNames = recipients
        .map(r => r.name.split(' ')[0])
        .join(' and ')

    const isMultiple = recipients.length > 1
    const prompt = `Write a kudos message for ${recipientNames} in the category "${category.name}". The tone should be ${tone}. 
${keywords ? `The recipient(s) specifically: ${keywords}` : ''}
${isMultiple ? 'This message is for multiple people, so make sure to address and acknowledge all of them equally in the message.' : ''}
Keep it concise but meaningful, around 2-3 sentences. The message should feel personal and specific to the category.`

    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 150
    })

    return completion.choices[0].message.content?.trim()
}

export async function generateGifSearchTerm({
                                                category,
                                                message
                                            }: {
    category: { name: string }
    message?: string
}) {
    const prompt = `Based on the following kudos category and message, suggest a single word or short phrase that would make a good GIF search term. The word should capture the emotional essence or theme.

Category: ${category.name}
Message: ${message || 'Not provided'}

Respond with ONLY the search term, nothing else. Keep it simple and relatable.`

    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        max_tokens: 10
    })

    return completion.choices[0].message.content?.trim()
}