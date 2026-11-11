export function statusClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "shipped":
      return "bg-[#DCE3F2] text-[#14213D] border-[#B6C3E0]";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-300";
    case "refunded":
      return "bg-[#EADFCB] text-[#14213D]/70 border-[#D9C9AD]";
    default:
      return "bg-[#FDE7CC] text-[#C2570C] border-[#F6C48C]";
  }
}
