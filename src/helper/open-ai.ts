import axios from "axios";

const OPENAI_API_KEY = "";


export const generateDocstrings = async (code: string) => {
    console.log('Generating coments for code');
    const prompt = `Add docstring-style comments to the following code:
    
    """
    ${code}
    """
    
    Return the updated code with appropriate docstrings.`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error generating docstrings:", error);
        return Promise.reject("Error generating docstrings.");
    }
};
