export const cvUpdatedTemplate = (candidateName: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; padding: 20px; }
    .container { max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 20px; }
    .title { font-size: 24px; color: #333; margin-bottom: 10px; }
    .message { font-size: 16px; color: #555; line-height: 1.5; margin-bottom: 20px; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">📄 CV Updated Successfully</h1>
    </div>
    <div class="message">
      <p>Hi ${candidateName},</p>
      <p>Your CV has been updated successfully in our system.</p>
      <p>Your profile information is now current and ready for job applications.</p>
    </div>
    <div class="footer">
      <p>If you have any questions or need to make further changes, please contact support.</p>
    </div>
  </div>
</body>
</html>
`;
