mkdir -p blobs
cat fsck.txt | grep blob | awk '{print $3}' | while read hash; do
  git show $hash > blobs/$hash.txt
done
