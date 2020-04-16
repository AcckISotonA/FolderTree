using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace DNSTreeView.Models
{
    public class Directory
    {
        private int _id;
        public int IdDirectory { get { return _id; } }
        public string Name { get; set; }
        public bool HasSubItems { get; set; }
        public List<Directory> Directories { get; set; }
        public List<File> Files { get; set; }

        public Directory(int id)
        {
            _id = id;
        }
    }
}
