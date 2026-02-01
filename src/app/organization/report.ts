export type Report = {
  _id: string;
  imageUrl?: string;
  classify: string;
  severity: string;
  status: "pending" | "verified" | "responding" | "resolved" | "false";
  location?: string;
  note?: string;
  createdAt: string;
};
