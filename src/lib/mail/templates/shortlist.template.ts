export const shortlistTemplate = (
  candidateName: string,
  jobTitle: string,
  farmName: string,
  aiGeneratedContent?: string,
) => {
  const content =
    aiGeneratedContent ||
    `We are pleased to inform you that your application for the position of <strong>${jobTitle}</strong> at <strong>${farmName}</strong> has been shortlisted.`;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Application Shortlisted</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Good news, ${candidateName}!</h2>
        
        <p>${content}</p>
        
        <p>The farm owner will be in touch shortly regarding the next steps.</p>
        
        <p>Best regards,<br>The TomsLiv Team</p>
    </div>
</body>
</html>
`;
};
