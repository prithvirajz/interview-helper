// System prompts and templates for Interview Copilot Assistant

export const SYSTEM_PROMPT = `You are an Interview Copilot Assistant. When given an interview question, provide ONLY a direct, ready-to-speak answer.

RULES:
- Give ONLY the answer the candidate should say
- No explanations, no suggestions, no extra commentary
- No bullet points, no headers, no formatting
- First-person, natural spoken style
- Concise and confident
- Do not mention being an AI
- Do not add phrases like "You could say..." or "A good answer would be..."
- Use the candidate's resume and job description context to personalize answers
- Reference specific experiences from the resume when relevant

Just provide the exact words the candidate should speak.`;

export const buildUserMessage = (transcript, profile, interviewType) => {
    let context = '';

    if (profile.resume) {
        context += '\n\nCANDIDATE RESUME:\n' + profile.resume + '\n';
    }

    if (profile.jobDescription) {
        context += '\n\nJOB DESCRIPTION:\n' + profile.jobDescription + '\n';
    }

    if (profile.role || profile.experience) {
        context += '\n\nADDITIONAL CONTEXT:\n';
        if (profile.role) context += `Role: ${profile.role}\n`;
        if (profile.experience) context += `Experience: ${profile.experience}\n`;
    }

    return `${context}\nQuestion: "${transcript}"\n\nProvide only the direct answer to say:`;
};

export const INTERVIEW_TYPES = [
    { value: 'general', label: 'General' },
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'technical', label: 'Technical' },
    { value: 'system-design', label: 'System Design' },
    { value: 'coding', label: 'Coding' },
    { value: 'product', label: 'Product' }
];
