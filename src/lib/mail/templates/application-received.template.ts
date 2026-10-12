export const applicationReceivedTemplate = (
  candidateName: string,
  jobTitle: string,
  isExistingUser: boolean,
) => {
  const loginMessage = isExistingUser
    ? `<p>You can track the status of your application by logging into your account.</p>`
    : ``;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Application Received</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Application Received</h2>
        
        <p>Hi ${candidateName},</p>
        
        <p>Thanks for applying for the <strong>${jobTitle}</strong> position.</p>
        
        <p>We have successfully received your application. The farm owner will review your CV and details shortly.</p>
        
        ${loginMessage}
        
        <p>Best regards,<br>The TomsLiv Team</p>
    </div>
</body>
</html>
`;
};
