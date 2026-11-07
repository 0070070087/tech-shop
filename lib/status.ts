export function statusClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800 border-green-300";
    case "shipped":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
  }
}
