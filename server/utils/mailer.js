// Email stub. Swap the body for Nodemailer/SES/SendGrid when you are ready.
exports.sendMail = async ({ to, subject, text }) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `\n[mail] To: ${to}\n[mail] Subject: ${subject}\n[mail] ${text}\n`,
    );
  }
};
