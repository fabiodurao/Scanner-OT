import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Variable } from "lucide-react";

export function ReviewVariablesButton({ siteId }: { siteId: string }) {
  return (
    <Link to={`/discovery/${siteId}/variables`}>
      <Button variant="outline">
        <Variable className="h-4 w-4 mr-2" />
        Review Variables
      </Button>
    </Link>
  );
}