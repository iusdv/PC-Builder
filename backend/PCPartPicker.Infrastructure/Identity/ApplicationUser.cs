using Microsoft.AspNetCore.Identity;

namespace PCPartPicker.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
	public string Role { get; set; } = "user";
}
