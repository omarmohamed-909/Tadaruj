import jwt from "jsonwebtoken";

export const generateToken = (res, user, message) => {
  const isProduction = process.env.NODE_ENV === "production";
  const safeUser = typeof user?.toObject === "function" ? user.toObject() : { ...user };
  delete safeUser.password;

  const token = jwt.sign({ userId: user._id, purpose: "access" }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });

  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, //1 day
    }).json({
        success:true,
        message,
      token,
      user:safeUser
    });
};
