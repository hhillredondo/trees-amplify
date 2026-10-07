import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/help',
  component: HelpPage,
})

function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
        Help & Documentation
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-8">
        Learn how to create and manage your trees
      </p>

      <div className="space-y-8">
        {/* Getting Started */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Getting Started
          </h2>
          <div className="space-y-4 text-[var(--color-text-secondary)]">
            <p>
              Welcome to Trees Lab! This app helps you create and visualize trees for your own family or fictional characters.
            </p>
            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Creating Your First Tree
              </h3>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>From the dashboard, click <strong>"Create New Tree"</strong></li>
                <li>Give your tree a name (e.g., "The Smith Family" or "Game of Thrones")</li>
                <li>Click <strong>"Create"</strong> to start building your tree</li>
              </ol>
            </div>
            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Adding Your First Member
              </h3>
              <p>
                When you open a new tree, you'll see an empty view. Click on the member card (if one exists) or use the search bar to find members. 
                To add your first member, you'll need to create a member through the tree interface.
              </p>
            </div>
          </div>
        </section>

        {/* Understanding the Tree View */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Understanding the Tree View
          </h2>
          <div className="space-y-4 text-[var(--color-text-secondary)]">
            <p>
              The tree view is organized around a <strong>focused member</strong> (the person you're currently viewing). 
              The view shows:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Parents</strong> - displayed above the focused member</li>
              <li><strong>Focused Member</strong> - centered in the view</li>
              <li><strong>Siblings</strong> - displayed to the left of the focused member</li>
              <li><strong>Spouses</strong> - displayed to the right of the focused member</li>
              <li><strong>Children</strong> - displayed below the focused member</li>
            </ul>
            <p>
              Click <strong>"Extended"</strong> in the top bar to also show <strong>grandparents</strong> above each parent,
              and each parent's siblings (<strong>aunts and uncles</strong>) beside that parent. The extended view stays on
              as you move between members until you click it again. Rows with more members than fit on screen scroll sideways.
            </p>
            <p>
              To change the focus, click on any member card, or use the search bar at the top of the tree view to find and select a member.
            </p>
          </div>
        </section>

        {/* Adding Members */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Adding Members to Your Tree
          </h2>
          <div className="space-y-4 text-[var(--color-text-secondary)]">
            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Adding a Child
              </h3>
              <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                <li>Click on a member card to view their details</li>
                <li>Click <strong>"Add Child"</strong> in the member detail modal</li>
                <li>Fill in the child's information (name, surname, gender, birth date, etc.)</li>
                <li>If the parent has a spouse, the child will automatically be linked to both parents</li>
                <li>Click <strong>"Create"</strong> to add the child</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Adding a Parent
              </h3>
              <p>
                When you add a parent to a member who already has one parent, the system will automatically create a marriage 
                between the two parents. The marriage date is automatically set to 9 months before the child's birth date. 
                This ensures that children always have properly linked parents.
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                <li>Click on a member card to view their details</li>
                <li>Click <strong>"Add Parent"</strong> in the member detail modal</li>
                <li>Fill in the parent's information</li>
                <li>If the child already has one parent, a marriage will be automatically created between the two parents with the marriage date set to 9 months before the child's birth</li>
                <li>Click <strong>"Create"</strong> to add the parent</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Adding a Spouse
              </h3>
              <p>
                Spouses represent marriages between two members. You can add multiple spouses to represent multiple marriages 
                (though not simultaneously - see limitations below).
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                <li>Click on a member card to view their details</li>
                <li>Click <strong>"Add Spouse"</strong> in the member detail modal</li>
                <li>Fill in the spouse's information and marriage details</li>
                <li>If the member already has children from a previous relationship, the system may automatically link them to the new spouse if appropriate</li>
                <li>Click <strong>"Create"</strong> to add the spouse</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Important Limitations */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Important Limitations & Rules
          </h2>
          <div className="space-y-6 text-[var(--color-text-secondary)]">
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
                Tree View Limitations
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Close relatives only</strong> - Cousins, nieces, nephews and great-grandparents are not shown; focus on a closer relative to see them</li>
                <li><strong>One focused member at a time</strong> - The tree is centered around a single person</li>
                <li>Use the search function to quickly navigate between members</li>
              </ul>
            </div>

            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
                Marriage Rules
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Heterosexual marriages only</strong> - Spouses must be of opposite genders</li>
                <li><strong>No bigamy</strong> - Both parties must be single (not currently married) at the time of marriage</li>
                <li><strong>Minimum age</strong> - Both parties must be at least 16 years old at the time of marriage</li>
                <li><strong>Children in marriage</strong> - Children must be born during the marriage or up to 9 months after divorce</li>
              </ul>
            </div>

            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
                Parent-Child Rules
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Maximum 2 parents</strong> - Each child can have at most 2 parents</li>
                <li><strong>Parent must be alive</strong> - A parent must be alive at the time of the child's birth</li>
                <li><strong>Minimum parental age</strong> - Parents must be at least ~12 years 9 months old at the child's birth</li>
                <li><strong>Maximum parental age</strong> - Fathers must be under 100 years old, mothers under 60 years old at the child's birth</li>
                <li><strong>Sibling spacing</strong> - Siblings from the same parent must be born at least 9 months apart (except for multiples like twins, up to 8 siblings can share the same birth date)</li>
              </ul>
            </div>

            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
                Member Information Rules
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Gender is permanent</strong> - Once set, gender cannot be changed</li>
                <li><strong>Birth and death dates are permanent</strong> - Once set, these dates cannot be modified</li>
                <li><strong>Name limitations</strong> - Names and surnames are limited to 50 characters and can only contain letters, spaces, hyphens, and apostrophes</li>
                <li><strong>Maximum lifespan</strong> - A member cannot live longer than 120 years</li>
              </ul>
            </div>

            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
                Deletion Rules
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Graph connectivity</strong> - A member can only be deleted if the remaining tree stays connected (all members can still reach each other)</li>
                <li><strong>Last member</strong> - Deleting the last member in a tree will delete the entire tree</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Editing Members */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Editing Members
          </h2>
          <div className="space-y-4 text-[var(--color-text-secondary)]">
            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Editing Member Information
              </h3>
              <p>
                To edit a member's information:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                <li>Click on the member's card to open the detail modal</li>
                <li>Click <strong>"Edit"</strong> in the member detail modal</li>
                <li>Modify the information you want to change</li>
                <li>Note: Gender, birth date, and death date cannot be changed after creation</li>
                <li>Click <strong>"Save"</strong> to apply changes</li>
              </ol>
            </div>
            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Editing Marriage Dates
              </h3>
              <p>
                To edit the marriage date or divorce date between two spouses:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                <li>In the tree view, locate the two spouses you want to edit</li>
                <li>Click on the heart (♥) icon that appears between the two spouse cards</li>
                <li>In the marriage edit modal, update the marriage date and/or divorce date</li>
                <li>Click <strong>"Save"</strong> to apply the changes</li>
              </ol>
              <p className="mt-2">
                Note: You can only edit marriage details if you have edit permissions for the tree (owner or editor role).
              </p>
            </div>
          </div>
        </section>

        {/* Tree Management */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Managing Your Trees
          </h2>
          <div className="space-y-4 text-[var(--color-text-secondary)]">
            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Tree Access & Sharing
              </h3>
              <p>
                As a tree owner, you can manage who has access to your tree:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
                <li>Click <strong>"Access"</strong> in the tree view to manage permissions</li>
                <li>You can invite others as <strong>editors</strong> (can modify the tree) or <strong>viewers</strong> (read-only)</li>
                <li>Only the tree owner can delete the tree or manage access</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Deleting a Tree
              </h3>
              <p>
                Tree owners can delete their trees from the tree view. This action is permanent and cannot be undone. 
                All members and relationships in the tree will be deleted.
              </p>
            </div>
          </div>
        </section>

        {/* Tips & Best Practices */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Tips & Best Practices
          </h2>
          <div className="space-y-4 text-[var(--color-text-secondary)]">
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Start with a central figure</strong> - Begin with one person and build outward (add parents, children, and spouses)</li>
              <li><strong>Use the search function</strong> - When working with large trees, use the search bar to quickly find members</li>
              <li><strong>Double-check dates</strong> - Make sure birth dates, marriage dates, and death dates are accurate, as they cannot be changed later</li>
              <li><strong>Verify gender</strong> - Gender cannot be changed after creation, so make sure it's correct from the start</li>
              <li><strong>Use descriptions</strong> - The description field (up to 10,000 characters) is great for adding notes, stories, or additional context about family members</li>
            </ul>
          </div>
        </section>

        {/* Account Limits */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Account Limits
          </h2>
          <div className="space-y-4 text-[var(--color-text-secondary)]">
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
                Tree Limit
              </h3>
              <p className="mb-2">
                Each account can have access to up to <strong>5 trees</strong> total. This includes:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Trees you create (as owner)</li>
                <li>Trees you're invited to edit (as editor)</li>
                <li>Trees you're invited to view (as viewer)</li>
              </ul>
              <p className="mt-2">
                The limit counts all trees where you have any role. If you're invited to 5 trees, you've reached the limit even if you haven't created any yourself.
              </p>
            </div>
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
                Storage Limit
              </h3>
              <p>
                Each tree can store up to <strong>1GB</strong> of photos. This includes:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>Profile pictures for members</li>
                <li>Additional photos uploaded for each member</li>
              </ul>
              <p className="mt-2">
                If you reach the storage limit for a tree, you'll need to delete some photos before uploading new ones.
              </p>
            </div>
          </div>
        </section>

        {/* Need More Help */}
        <section>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-4">
            Need More Help?
          </h2>
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-4">
            <p className="text-[var(--color-text-secondary)]">
              If you encounter any issues or have questions not covered in this documentation, 
              please check the validation messages that appear when you try to add or modify members. 
              These messages will explain why certain actions aren't allowed and what you need to change.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

