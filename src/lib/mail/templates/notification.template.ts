export const notificationTemplate = (
  title: string,
  message: string,
  link?: string,
) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; padding: 20px; }
    .container { max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 20px; }
    .title { font-size: 24px; color: #333; margin-bottom: 10px; }
    .message { font-size: 16px; color: #555; line-height: 1.5; margin-bottom: 20px; }
    .button-container { text-align: center; margin-top: 20px; }
    .button { background-color: #007bff; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; display: inline-block; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${title}</h1>
    </div>
    <div class="message">
      <p>${message}</p>
    </div>
    ${
      link
        ? `<div class="button-container">
             <a href="${link}" class="button">View Details</a>
           </div>`
        : ''
    }
    <div class="footer">
      <p>If you have any questions, please contact support.</p>
    </div>
  </div>
</body>
</html>
`;
