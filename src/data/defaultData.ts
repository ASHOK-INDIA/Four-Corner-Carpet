export const SHIPMENT_STEPS = [
  "1. Packing",
  "2. Packed",
  "3. Out From Factory Gate",
  "4. On the way to Port",
  "5. Under Custom Clearance",
  "6. Clearance Done",
  "7. Loading on Container",
  "8. Handed over to Forwarder",
  "9. Loaded on Vessel"
] as const;

export function getMilestoneDescription(stepNum: number): string {
  switch (stepNum) {
    case 1: return "Items being sorted, boxed and measured for transport.";
    case 2: return "Packaging completed and ready at warehouse dispatch dock.";
    case 3: return "Shipment has departed the Poptop manufacturing facility gate.";
    case 4: return "Transport vehicle on route to export sea/air port.";
    case 5: return "Documentation submitted for official export custom clearance.";
    case 6: return "Custom clearance successfully approved and verified.";
    case 7: return "Cargo loaded securely onto shipping container.";
    case 8: return "Container handed over to freight forwarder agency.";
    case 9: return "Vessel departed port on international water route.";
    default: return "Logistics stage in progress.";
  }
}
